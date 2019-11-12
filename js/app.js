var user = {};

var sipPhone = ( function ( config)
{
  var userAgent;

  var sessions = [],
      callTimers = {},
      callActiveID = null,
      callVolume = 1,
      stream = null;

  var callStatus = '',
      connectionStatus = '';

  var ringtone = document.getElementById ( 'ringtone');
  var ringbacktone = document.getElementById ( 'ringbacktone');

  var remoteAudio = document.getElementById ( 'remoteAudio');
  var localAudio = document.getElementById ( 'localAudio');

  var options = {};

  /**
   * Set connection options with default values
   *
   * @param {[object]} config
   */
  var setOptions = function ( config)
  {
    options =
    {
      authorizationUser: 'ws' + config.user,
      password: config.password,
      displayName: config.displayName || '',
      transportOptions:
      {
        wsServers:
        [
          {
            scheme: 'WSS',
            sipUri: '<sip:' + config.user + '@' + config.realm + ';transport=wss;lr>',
            weight: 1,
            wsUri: 'wss://' + window.location.hostname + ':443/ws',
            isError: false
          }
        ]
      },
      uri: 'sip:ws' + config.user + '@' + config.realm,
      log:
      {
        level: 'debug'
      },
      hackIpInContact: config.hackIpInContact || false
    };
  };

  if ( typeof ( config) === 'undefined')
  {
    config = new Object ();
  }
  if ( config.length === 0)
  {
    config = JSON.parse ( localStorage.getItem ( 'SIPCreds'));
    if ( config)
    {
      $.each ( config, function ( k, v)
      {
        $('input[name="' + k + '"]').val ( v);
      });
    }
  }
  $.extend ( config, { realm: 'localhost.localdomain'});

  setOptions ( config);

  /**
   * Stopwatch object used for call timers
   *
   * @param {dom element} elem
   * @param {[object]} options
   */
  var Stopwatch = function ( elem, options)
  {
    // private functions
    function createTimer ()
    {
      return document.createElement ( 'span');
    }

    var timer = createTimer (),
        offset,
        clock,
        interval;

    // default options
    options = options || {};
    options.delay = options.delay || 1000;
    options.startTime = options.startTime || Date.now ();

    // append elements
    elem.appendChild ( timer);

    function start ()
    {
      if ( ! interval)
      {
        offset = options.startTime;
        interval = setInterval ( update, options.delay);
      }
    }

    function stop ()
    {
      if ( interval)
      {
        clearInterval ( interval);
        interval = null;
      }
    }

    function reset ()
    {
      clock = 0;
      render ();
    }

    function update ()
    {
      clock += delta ();
      render ();
    }

    function render ()
    {
      timer.innerHTML = moment ( clock).format ( 'mm:ss');
    }

    function delta ()
    {
      var now = Date.now (),
          d = now - offset;

      offset = now;
      return d;
    }

    // initialize
    reset ();

    // public API
    this.start = start;
    this.stop  = stop;
  };

  var methods =
  {
    init: function ()
    {
      if ( typeof ( SIP) === 'undefined')
      {
        throw new Error ( 'SIP.js library is not found');
        return;
      }
      methods.initUserAgent ();
      methods.initUI ();

      // Hide the splash after 3 secs.
      setTimeout ( function ()
      {
        methods.logShow ();
      }, 3000);
    },
    initUserAgent: function ()
    {
      userAgent = new SIP.UA ( options);

      /*
        userAgent events:
        registered
        unregistered
        registrationFailed
        invite
        message
        outOfDialogReferRequested
        transportCreated
      */

      userAgent.on ( 'registered', function ( e)
      {
        var closeEditorWarning = function ()
        {
          return translator.get ( 'If you close this window, you will not be able to make or receive calls from your browser.');
        };

        var closePhone = function ()
        {
          // stop the phone on unload
          localStorage.removeItem ( 'ctxPhone');
          userAgent.stop ();
        };

        window.onbeforeunload = closeEditorWarning;
        window.onunload = closePhone;

        // This key is set to prevent multiple windows.
        localStorage.setItem ( 'ctxPhone', 'true');

        // TODO: change it
        $('#mldError').modal ( 'hide');
        methods.setConnectionStatus ( translator.get ( 'Ready'));

        // Get the userMedia and cache the stream
        if ( navigator.getUserMedia)
        {
          navigator.getUserMedia (
          {
            audio: true,
            video: false
          }, methods.getUserMediaSuccess, methods.getUserMediaFailure);
        }
      });

      userAgent.on ( 'registrationFailed', function ( e)
      {
        methods.setError ( true, translator.get ( 'Registration Error.'), translator.get ( 'An Error occurred registering your phone. Check your settings.'));
        methods.setConnectionStatus ( translator.get ( 'Error: Registration Failed'));
      });

      userAgent.on ( 'unregistered', function ( e)
      {
        methods.setError ( true, translator.get ( 'Registration Error.'), translator.get ( 'An Error occurred registering your phone. Check your network connectivity.'));
        methods.setConnectionStatus ( translator.get ( 'Error: Unregistered'));
      });

      userAgent.on ( 'invite', function ( incomingSession)
      {
        incomingSession.direction = 'incoming';
        methods.newSession ( incomingSession);
      });
    },

    // getUser media request refused or device was not present
    getUserMediaFailure: function ( e)
    {
      window.console.error ( 'getUserMedia failed:', e);
      methods.setError ( true, translator.get ( 'Media Error.'), translator.get ( 'You must allow access to your microphone. Check the address bar.'), true);
    },

    getUserMediaSuccess: function ( newStream)
    {
      stream = newStream;
    },

    initUI: function ()
    {
      // Auto-focus number input on backspace.
      $('#sipClient').on ( 'keydown', function ( event)
      {
        if ( event.which === 8)
        {
          $('#numDisplay').focus ();
        }
      });

      $('#numDisplay').on ( 'keypress', function ( event)
      {
        // Enter pressed? so Dial.
        if ( event.which === 13)
        {
          methods.phoneCallButtonPressed ();
        }
      });

      $('.digit').on ( 'mousedown touchstart', function ( event)
      {
        event.preventDefault ();
        var keyPressed = $(this).data ( 'digit');
        var frequencyPair = dtmfFrequencies[keyPressed]; // this looks up which frequency pair we need

        // this sets the freq1 and freq2 properties
        dtmf.freq1 = frequencyPair.f1;
        dtmf.freq2 = frequencyPair.f2;

        if ( dtmf.status == 0)
        {
          dtmf.start ();
        }

        // add digit to display
        $('#numDisplay').val ( $('#numDisplay').val () + keyPressed);
        methods.sipSendDTMF ( keyPressed);
        return false;
      });

      // we detect the mouseup event on the window tag as opposed to the li
      // tag because otherwise if we release the mouse when not over a button,
      // the tone will remain playing
      $(window).on ( 'mouseup touchend', function ( event)
      {
        if ( typeof dtmf !== 'undefined' && dtmf.status)
        {
          dtmf.stop ();
        }
      });

      $('#myModal').on ( 'shown.bs.modal', function ()
      {
        $(this).find ( 'input').first ().focus ();
      });

      $('#mdlDemo').on ( 'keypress', 'input', function ( event)
      {
        if ( event.which === 13)
        {
          $('#saveSettings').trigger ( 'click');
        }
      });

      $('#saveSettings').on ( 'click', function ( event)
      {
        event.preventDefault ();

        var config = {},
            valid = true;

        // validate the form
        $('#myModal #mandatory input').each ( function ( i)
        {
          if ( $(this).val () === '')
          {
            $(this).closest ( '.form-group').addClass ( 'has-error');
            valid = false;
          } else {
            $(this).closest ( '.form-group').removeClass ( 'has-error');
          }
          config[$(this).attr ( 'name')] = $(this).val ();
        });

        // Save the phone credentials.
        if ( valid)
        {
          localStorage.setItem ( 'SIPCreds', JSON.stringify ( config));
          $('#myModal').modal ( 'hide');
          setOptions ( config);
          if ( userAgent.isRegistered () === true)
          {
            userAgent.stop ();
          }
          methods.initUserAgent ();
        }
      });

      $('#phoneUI .dropdown-menu .digit').on ( 'click', function ( event)
      {
        return false;
      });

      $('#phoneUI').on ( 'click', '.btnCall', function ( event)
      {
        event.preventDefault ();
        methods.phoneCallButtonPressed ();
      });

      $('.sipLogClear').on ( 'click', function ( event)
      {
        event.preventDefault ();
        methods.logClear ();
      });

      var $logItems = $('#sip-logitems');

      $logItems.on ( 'click', '.sip-logitem .btnCall', function ( event)
      {
        event.preventDefault ();
        var sessionid = $(this).closest ( '.sip-logitem').data ( 'sessionid');
        methods.phoneCallButtonPressed ( sessionid);
        return false;
      });

      $logItems.on ( 'click', '.sip-logitem .btnHoldResume', function ( event)
      {
        var sessionid = $(this).closest ( '.sip-logitem').data ( 'sessionid');
        methods.phoneHoldButtonPressed ( sessionid);
        return false;
      });

      $logItems.on ( 'click', '.sip-logitem .btnHangUp', function ( event)
      {
        var sessionid = $(this).closest ( '.sip-logitem').data ( 'sessionid');
        methods.sipHangUp ( sessionid);
        return false;
      });

      $logItems.on ( 'click', '.sip-logitem .btnTransfer', function ( event)
      {
        var sessionid = $(this).closest ( '.sip-logitem').data ( 'sessionid');
        methods.sipTransfer(sessionid);
        return false;
      });

      $logItems.on ( 'click', '.sip-logitem .btnMute', function ( event)
      {
        var sessionid = $(this).closest ( '.sip-logitem').data ( 'sessionid');
        methods.phoneMuteButtonPressed ( sessionid);
        return false;
      });

      $logItems.on ( 'dblclick', '.sip-logitem', function ( event)
      {
        event.preventDefault();

        var uri = $(this).data ( 'uri');
        $('#numDisplay').val ( uri);
        methods.phoneCallButtonPressed ();
      });

      $('#sldVolume').on ( 'change', function ()
      {
        var v = $(this).val () / 100;
        var $btn = $('#btnVol');
        var $icon = $btn.find ( 'i'),
            active = callActiveID;

        // Set the object and media stream volumes
        if ( sessions[active])
        {
          sessions[active].player.volume = v;
          callVolume = v;
        }

        // Set the others
        $('audio').each ( function ()
        {
          $(this).get ()[0].volume = v;
        });

        if ( v < 0.1)
        {
          $btn.removeClass ( function ( index, css)
          {
            return ( css.match ( /(^|\s)btn\S+/g) || []).join ( ' ');
          }).addClass ( 'btn btn-sm btn-danger');
          $icon.removeClass ().addClass ( 'fa fa-fw fa-volume-off');
        } else {
          if ( v < 0.8)
          {
            $btn.removeClass ( function ( index, css)
            {
              return ( css.match ( /(^|\s)btn\S+/g) || []).join ( ' ');
            }).addClass ( 'btn btn-sm btn-info');
            $icon.removeClass ().addClass ( 'fa fa-fw fa-volume-down');
          } else {
            $btn.removeClass ( function ( index, css)
            {
              return ( css.match ( /(^|\s)btn\S+/g) || []).join ( ' ');
            }).addClass ( 'btn btn-sm btn-primary');
            $icon.removeClass ().addClass ( 'fa fa-fw fa-volume-up');
          }
        }
        return false;
      });
    },

    call: function ( targetNumber)
    {
      var session;
      try
      {
        session = userAgent.invite ( targetNumber,
        {
          sessionDescriptionHandlerOptions:
          {
            constraints:
            {
              audio: true,
              video: false
            }
          }
        });

        session.direction = 'outgoing';
        methods.newSession ( session)
      } catch ( e) {
        throw ( e);
      }
    },

    phoneMuteButtonPressed: function ( sessionid)
    {
      var s = sessions[sessionid];
      s.isMuted = ! s.isMuted;

      if ( s.isMuted)
      {
        methods.setCallSessionStatus ( translate.get ( 'Muted'));
      } else {
        methods.setCallSessionStatus ( translate.get ( 'Answered'));
      }

      var pc = s.sessionDescriptionHandler.peerConnection;
      pc.getLocalStreams ().forEach ( function ( stream)
      {
        stream.getAudioTracks ().forEach ( function ( track)
        {
          track.enabled = ! s.isMuted;
        });
      });
    },

    phoneHoldButtonPressed: function ( sessionid)
    {
      var session = sessions[sessionid];
      if ( ! session)
      {
        return;
      } else {
        if ( session.isOnHold)
        {
          session.unhold ();
          methods.logCall ( session, 'resumed');
          callActiveID = session.ctxid;
        } else {
          session.hold ();
          callActiveID = null;
          methods.logCall ( session, 'holding');
        }
      }
    },

    sipTransfer: function ( sessionid)
    {
      var s = sessions[sessionid],
          target = window.prompt ( translator.get ( 'Enter destination number'), '');

      methods.setCallSessionStatus ( '<i>' + translator.get ( 'Transfering the call...') + '</i>');
      s.refer ( target);
    },

    sipHangUp: function ( sessionid)
    {
      var s = sessions[sessionid];
      if ( ! s)
      {
        return;
      } else {
        if ( s.startTime)
        {
          s.bye ();
        } else {
          if ( s.reject)
          {
            s.reject ();
          } else {
            if ( s.cancel)
            {
              s.cancel ();
            }
          }
        }
      }
    },

    sipSendDTMF: function ( digit)
    {
      var a = callActiveID;
      if ( a)
      {
        var s = sessions[a];
        s.dtmf ( String ( digit));
      }
    },

    phoneCallButtonPressed: function ( sessionid)
    {
      var s = sessions[sessionid],
          target = $('#numDisplay').val ();

      if ( ! s)
      {
        $('#numDisplay').val ( '');
        methods.call ( target);
      } else {
        if ( s.accept && ! s.startTime)
        {
          s.accept (
          {
            sessionDescriptionHandlerOptions:
            {
              constraints:
              {
                audio: true,
                video: false
              }
            }
          });
        }
      }
    },

    newSession: function ( newSession)
    {
      // check next
      newSession.displayName = newSession.remoteIdentity.displayName || newSession.remoteIdentity.uri.user;
      newSession.ctxid = Math.random ().toString ( 36).substr ( 2, 9);
      newSession.isOnHold = false;
      newSession.isMuted = false;

      var status;
      if ( newSession.direction === 'incoming')
      {
        status = translator.get ( 'Incoming: ') + newSession.displayName;
        methods.startRingTone ();
      } else {
        status = translator.get ( 'Trying: ') + newSession.displayName;
        methods.startRingbackTone ();
      }

      methods.logCall ( newSession, 'ringing');
      methods.setCallSessionStatus ( status);

      newSession.on ( 'progress', function ( e)
      {
        if ( e.direction === 'outgoing')
        {
          methods.setCallSessionStatus ( translator.get ( 'Calling...'));
        }
      });

      newSession.on ( 'accepted', function ( e)
      {
        // If there is another active call, hold it
        if ( callActiveID && callActiveID !== newSession.ctxid)
        {
          methods.phoneHoldButtonPressed ( callActiveID);
        }
        methods.stopRingbackTone ();
        methods.stopRingTone ();
        methods.setCallSessionStatus ( translator.get ( 'Answered'));
        methods.logCall ( newSession, 'answered');
        callActiveID = newSession.ctxid;
      });

      newSession.on ( 'directionChanged', function ()
      {
        var direction = newSession.sessionDescriptionHandler.getDirection ();
        if ( direction === 'sendrecv')
        {
          // unhold
          newSession.isOnHold = false;
        } else {
          // hold
          newSession.isOnHold = true;
        }
      });

      newSession.on ( 'trackAdded', function ()
      {
        var pc = newSession.sessionDescriptionHandler.peerConnection;

        // Gets remote tracks
        var remoteStream = new MediaStream ();
        pc.getReceivers ().forEach ( function ( receiver)
        {
          try
          {
            remoteStream.addTrack ( receiver.track);
          } catch ( e) { }
        });
        remoteAudio.srcObject = remoteStream;
        remoteAudio.play ();

        // Gets local tracks
        var localStream = new MediaStream ();
        pc.getSenders ().forEach ( function ( sender)
        {
          try
          {
            localStream.addTrack ( sender.track);
          } catch ( e) { }
        });
        localAudio.srcObject = localStream;
        localAudio.play ();
      });

      // TODO: add muted and unmuted events

      newSession.on ( 'cancel', function ( e)
      {
        methods.stopRingTone ();
        methods.stopRingbackTone ();
        methods.setCallSessionStatus ( translator.get ( 'Canceled'));
        if ( newSession.direction === 'outgoing')
        {
          callActiveID = null;
          newSession = null;
          methods.logCall ( this, 'ended');
        }
      });

      newSession.on ( 'bye', function ( e)
      {
        methods.stopRingTone ();
        methods.stopRingbackTone ();
        methods.setCallSessionStatus ( '');
        methods.logCall ( newSession, 'ended');
        callActiveID = null;
        newSession = null;
      });

      newSession.on ( 'failed', function ( e)
      {
        methods.stopRingTone ();
        methods.stopRingbackTone ();
        methods.setCallSessionStatus ( translator.get ( 'Terminated'));
        methods.logCall ( newSession, 'ended');
      });

      newSession.on ( 'rejected', function ( e)
      {
        methods.stopRingTone ();
        methods.stopRingbackTone ();
        methods.setCallSessionStatus ( translator.get ( 'Rejected'));
        callActiveID = null;
        methods.logCall ( this, 'ended');
        newSession = null;
      });

      sessions[newSession.ctxid] = newSession;
    },

    // Sound methods
    startRingTone: function ()
    {
      try
      {
        ringtone.play ();
      } catch ( e) {}
    },
    stopRingTone: function ()
    {
      try
      {
        ringtone.pause ();
      } catch ( e) {}
    },

    startRingbackTone: function ()
    {
      try
      {
        ringbacktone.play ();
      } catch ( e) {}
    },
    stopRingbackTone: function ()
    {
      try
      {
        ringbacktone.pause ();
      } catch ( e) {}
    },

    /**
     * sets the ui call status field
     *
     * @param {string} status
     */
    setCallSessionStatus: function ( status)
    {
      callStatus = status;
      $('#txtCallStatus').html ( status);
    },

    /**
     * sets the ui connection status field
     *
     * @param {string} status
     */
    setConnectionStatus: function ( status)
    {
      connectionStatus = connectionStatus = status;
      $('#txtRegStatus').html ( '<i class="fa fa-signal"></i> ' + status);
    },
    setError: function ( err, title, msg, closable)
    {
      config.onSetError && config.onSetError ( err, title, msg, closable);
    },

    /**
     * logs a call to localstorage
     *
     * @param  {object} session
     * @param  {string} status Enum 'ringing', 'answered', 'ended', 'holding', 'resumed'
     */
    logCall: function ( session, status)
    {
      var log =
      {
        clid: session.displayName || '',
        uri: session.remoteIdentity.uri.toString (),
        id: session.ctxid,
        time: new Date ().getTime ()
      },
      calllog = JSON.parse ( localStorage.getItem ( 'sipCalls'));

      if ( ! calllog)
      {
        calllog = {};
      }

      if ( ! calllog.hasOwnProperty ( session.ctxid))
      {
        calllog[log.id] =
        {
          id: log.id,
          clid: log.clid,
          uri: log.uri,
          start: log.time,
          flow: session.direction
        };
      }

      if ( status === 'ended')
      {
        calllog[log.id].stop = log.time;
      }

      if ( status === 'ended' && calllog[log.id].status === 'ringing')
      {
        calllog[log.id].status = 'missed';
      } else {
        calllog[log.id].status = status;
      }

      localStorage.setItem ( 'sipCalls', JSON.stringify ( calllog));
      methods.logShow ();
    },

    /**
     * updates the call log ui
     */
    logShow: function ()
    {
      var calllog = JSON.parse ( localStorage.getItem ( 'sipCalls')),
          x = [];

      if ( calllog !== null)
      {
        $('#sip-splash').addClass ( 'hide');
        $('#sip-log').removeClass ( 'hide');

        // empty existing logs
        $('#sip-logitems').empty ();

        // JS doesn't guarantee property order so
        // create an array with the start time as
        // the key and sort by that.

        // Add start time to array
        $.each ( calllog, function ( k,v)
        {
          x.push ( v);
        });

        // sort descending
        x.sort ( function ( a, b)
        {
          return b.start - a.start;
        });

        $.each ( x, function ( k, v)
        {
          methods.logItem ( v);
        });

      } else {
        $('#sip-splash').removeClass ( 'hide');
        $('#sip-log').addClass ( 'hide');
      }
    },

    /**
     * adds a ui item to the call log
     *
     * @param  {object} item log item
     */
    logItem: function ( item)
    {
      var callActive = ( item.status !== 'ended' && item.status !== 'missed'),
          callLength = ( item.status !== 'ended') ? '<span id="' + item.id + '"></span>' : moment.duration ( item.stop - item.start).humanize (),
          callClass = '',
          callIcon,
          i;

      switch ( item.status)
      {
        case 'ringing':
          callClass = 'list-group-item-success';
          callIcon = 'fa-bell';
          break;
        case 'missed':
          callClass = 'list-group-item-danger';
          if ( item.flow === 'incoming')
          {
            callIcon = 'fa-chevron-left';
          }
          if ( item.flow === 'outgoing')
          {
            callIcon = 'fa-chevron-right';
          }
          break;
        case 'holding':
          callClass = 'list-group-item-warning';
          callIcon = 'fa-pause';
          break;
        case 'answered':
        case 'resumed':
          callClass = 'list-group-item-info';
          callIcon = 'fa-phone-square';
          break;
        case 'ended':
          if ( item.flow === 'incoming')
          {
            callIcon = 'fa-chevron-left';
          }
          if ( item.flow === 'outgoing')
          {
            callIcon = 'fa-chevron-right';
          }
          break;
      }

      i = '<div class="list-group-item sip-logitem clearfix ' + callClass + '" data-uri="' + item.uri + '" data-sessionid="' + item.id + '" title="Duplo clique para ligar">';
      i += '<div class="clearfix"><div class="pull-left">';
      i += '<i class="fa fa-fw ' + callIcon + ' fa-fw"></i> <strong>' + item.uri + '</strong><br><small>' + moment ( item.start).format ( translator.get ( 'MM/DD hh:mm:ss a')) + '</small>';
      i += '</div>';
      i += '<div class="pull-right text-right"><em>' + item.clid + '</em><br>' + callLength + '</div></div>';

      if ( callActive)
      {
        i += '<div class="btn-group btn-group-xs pull-right">';
        if ( item.status === 'ringing' && item.flow === 'incoming')
        {
          i += '<button class="btn btn-xs btn-success btnCall" title="' + translator.get ( 'Call') + '"><i class="fa fa-phone"></i></button>';
        } else {
          i += '<button class="btn btn-xs btn-primary btnHoldResume" title="' + translator.get ( 'Hold') + '"><i class="fa fa-pause"></i></button>';
          i += '<button class="btn btn-xs btn-info btnTransfer" title="' + translator.get ( 'Transfer') + '"><i class="fa fa-random"></i></button>';
          i += '<button class="btn btn-xs btn-warning btnMute" title="' + translator.get ( 'Mute') + '"><i class="fa fa-fw fa-microphone"></i></button>';
        }
        i += '<button class="btn btn-xs btn-danger btnHangUp" title="' + translator.get ( 'Hangup') + '"><i class="fa fa-stop"></i></button>';
        i += '</div>';
      }
      i += '</div>';

      $('#sip-logitems').append ( i);

      // Start call timer on answer
      if ( item.status === 'answered')
      {
        var tEle = document.getElementById ( item.id);
        callTimers[item.id] = new Stopwatch ( tEle);
        callTimers[item.id].start ();
      }

      if ( callActive && item.status !== 'ringing')
      {
        callTimers[item.id].start (
        {
          startTime: item.start
        });
      }

      $('#sip-logitems').scrollTop ( 0);
    },

    /**
     * removes log items from localstorage and updates the UI
     */
    logClear: function ()
    {
      localStorage.removeItem ( 'sipCalls');
      methods.logShow ();
    }
  };

  methods.init ();

  return {
    call: function ( targetNumber)
    {
      return methods.call ( targetNumber)
    },
    status: function ()
    {
      return {
        connection: connectionStatus,
        call: callStatus
      }
    }
  }
}) ();
