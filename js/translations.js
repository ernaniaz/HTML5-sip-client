var i18n =
{
  "Username and Password fields are required.":
  {
    fr: "Les champs Nom d'utilisateur et Mot de passe sont obligatoires.",
    pt: "Os campos de usuário e senha são obrigatórios."
  },
  "SIP Settings":
  {
    fr: "Paramètres SIP",
    pt: "Configurações SIP"
  },
  "Username:":
  {
    fr: "Identifiant:",
    pt: "Usuário:"
  },
  "Password:":
  {
    fr: "Mot de passe:",
    pt: "Senha:"
  },
  "Server:":
  {
    fr: "Serveur:",
    pt: "Servidor:"
  },
  "Display name:":
  {
    pt: "Nome de exibição:"
  },
  "Close":
  {
    fr: "Fermer",
    pt: "Fechar"
  },
  "Save":
  {
    fr: "Save",
    pt: "Salvar"
  },
  " Call":
  {
    fr: " Appel",
    pt: " Ligar"
  },
  "Closing this window will cause calls to go to voicemail.":
  {
    fr: "Si vous fermez cette fenêtre, les appels seront dirigés vers la messagerie vocale.",
    pt: "Fechar esta janela fará suas ligações irem para o correio de voz."
  },
  "No recent calls from this browser.":
  {
    fr: "Pas d'appels récents.",
    pt: "Nenhuma ligação recente deste navegador."
  },
  "Sip registration failed. No calls can be handled.":
  {
    fr: "Échec de l'enregistrement. Impossible de recevoir des appels.",
    pt: "O registro SIP falhou. Nenhuma ligação poderá ser gerenciada."
  },
  "Recent Calls":
  {
    fr: "Appels Récents",
    pt: "Últimas ligações"
  },
  "Sip Error":
  {
    fr: "Erreur SIP",
    pt: "Erro SIP"
  },
  "Hold":
  {
    fr: "Mettre en Attente",
    pt: "Espera"
  },
  "Mute":
  {
    fr: "Couper le son",
    pt: "Mudo"
  },
  "Hangup":
  {
    fr: "Raccrocher",
    pt: "Desligar"
  },
  "Ready":
  {
    fr: "Prêt",
    pt: "Disponível"
  },
  "Connected":
  {
    fr: "Connecté",
    pt: "Conectado"
  },
  "Disconnected":
  {
    fr: "Déconnecté",
    pt: "Desconectado"
  },
  "Connecting...":
  {
    fr: "Connection...",
    pt: "Conecctando..."
  },
  "Calling...":
  {
    fr: "Appel en cours...",
    pt: "Chamando..."
  },
  "Incoming: ":
  {
    fr: "Appel Entrant: ",
    pt: "Nova ligação: "
  },
  "Trying: ":
  {
    fr: "Essaie: ",
    pt: "Tentando: "
  },
  "Rejected":
  {
    fr: "Rejeté",
    pt: "Rejeitada"
  },
  "Terminated":
  {
    fr: "Terminé",
    pt: "Finalizada"
  },
  "Canceled":
  {
    fr: "Annulé",
    pt: "Cancelada"
  },
  "Cancel":
  {
    pt: "Cancelar"
  },
  "Answered":
  {
    fr: "Répondu",
    pt: "Respondida"
  },
  "Muted":
  {
    fr: "Son coupé",
    pt: "Mutado"
  },
  "Error: Registration Failed":
  {
    fr: "Erreur: Échec de l'enregistrement",
    pt: "Erro: Registro falhou"
  },
  "Websocket Disconnected.":
  {
    fr: "Websocket déconnectée.",
    pt: "Websocket desconectado."
  },
  "An Error occurred connecting to the websocket.":
  {
    fr: "Une erreur est arrivée lors de la connexion de la websocket.",
    pt: "Ocorreu um erro ao conectar com o websocket."
  },
  "Registration Error.":
  {
    fr: "Authentification invalide",
    pt: "Erro de registro"
  },
  "An Error occurred registering your phone. Check your settings.":
  {
    fr: "Votre téléphone n'a pas pu s'enregistrer. Vérifiez vos identifiants.",
    pt: "Ocorreu um erro ao registrar seu telefone. Verifique as configurações."
  },
  "Unregistered.":
  {
    fr: "Non enregistré",
    pt: "Desregistrado"
  },
  "An Error occurred registering your phone. Check your network connectivity.":
  {
    fr: "Votre téléphone n'a pas pu s'enregistrer. Vérifiez votre connectivité.",
    pt: "Ocorreu um erro ao registrar seu telefone. Verifique a conectividade de rede."
  },
  "This is your phone.":
  {
    fr: "Voici votre téléphone.",
    pt: "Este é o seu telefone."
  },
  "If you close this window, you will not be able to receive calls in your browser.":
  {
    fr: "Si vous fermez cette fenêtre, vous ne pourrez plus recevoir d'appels dans votre navigateur.",
    pt: "Se você fechar esta janela, você não poderá receber ligações no seu navegador."
  },
  "Unsupported Browser.":
  {
    fr: "Votre navigateur n'est pas supporté.",
    pt: "Navegador não suportado."
  },
  "Your browser does not support the features required for this phone.":
  {
    fr: "Votre navigateur ne supporte pas les fonctionnalités requise.",
    pt: "Seu navegador não possui os recursos necessários para este telefone."
  },
  "WebRTC support not found":
  {
    fr: "Support WebRTC non trouvé",
    pt: "Suporte WebRTC não encontrado"
  },
  "Media Error.":
  {
    fr: "Erreur Média.",
    pt: "Erro de mídia."
  },
  "You must allow access to your microphone. Check the address bar.":
  {
    fr: "Vous devez autoriser l'accès à votre microphone. Vérifier dans la barre d'adresse",
    pt: "Você deve permitir o acesso ao seu microfone. Verifique a barra de endereços."
  },
  "Enter destination number":
  {
    pt: "Entre o número de destino"
  },
  "Transfering the call...":
  {
    pt: "Transferindo a ligação..."
  },
  "MM/DD hh:mm:ss a":
  {
    pt: "DD/MM HH:mm:ss"
  }
}

var translator = null;

$(document).ready ( function ()
{
  var locale = window.navigator.userLanguage || window.navigator.language;
  // translator = $('body').translate ( { lang: locale, t: i18n});
  // moment.locale ( locale);
  translator = $('body').translate ( { lang: 'pt', t: i18n});
  moment.locale ( 'pt-br');
});
