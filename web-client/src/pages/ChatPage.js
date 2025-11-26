import axios from "axios";
import { Menu } from "../components/Menu.js";
import { UserList } from "../components/UserList.js";
import { Chat } from "../components/Chat.js";
import { Call } from "../components/Call.js";
import { WebSocketService } from "../services/WebSocketService.js";

export class ChatPage {
  constructor(router) {
    this.router = router;
    this.selectedUser = null;
  }

  render() {
    const box = document.createElement("div");
    box.id = "box";
    const container = document.createElement("div");
    container.classList.add("container");

    const header = new Menu(this.router).render();

    // Área principal (puede tener el chat o la llamada)
    const chatArea = document.createElement("div");
    chatArea.classList.add("chat");

    chatArea.innerHTML = `
      <div class="no-user-selected">
        <p class="light-text">Selecciona un usuario para chatear</p>
      </div>
    `;

    // -----------------------------------------------------------
    // 1. LOGICA DE SELECCIÓN DE USUARIO
    // -----------------------------------------------------------
    const onUserSelected = (username) => {
      this.selectedUser = username;
      renderChatView(); // Función helper definida abajo
    };

    // Helper para mostrar el Chat normal
    const renderChatView = () => {
      chatArea.innerHTML = "";

      // Barra superior: Título + Botón Llamar
      const topBar = document.createElement("div");
      topBar.classList.add("top-chat", "sidebar-text");

      const titleSpan = document.createElement("span");
      titleSpan.textContent = `Chat con ${this.selectedUser}`;

      const callButton = document.createElement("button");
      callButton.classList.add("call-button"); // Asegúrate de tener estilo para esto o usa 'button-on-off'
      callButton.textContent = "📞 Llamar";
      callButton.style.marginLeft = "auto";
      callButton.style.cursor = "pointer";

      topBar.appendChild(titleSpan);
      topBar.appendChild(callButton);
      chatArea.appendChild(topBar);

      // Componente de Chat
      const chat = new Chat(this.selectedUser, false).render();
      chatArea.appendChild(chat);

      // --- EVENTO DE LLAMADA SALIENTE ---
      callButton.addEventListener("click", async () => {
        const sender = sessionStorage.getItem("username");
        const receiver = this.selectedUser;

        try {
          console.log(`Iniciando llamada a ${receiver}...`);
          // 1. Solicitar permiso a Ice (Java)
          const response = await axios.post("http://localhost:3001/api/call/request", {
            sender, receiver
          });

          if(response.data.status === 'ok') {
            // 2. Si Java autoriza, mostramos la interfaz de llamada
            renderCallView(receiver);
          } else {
            alert("No se pudo iniciar la llamada: " + response.data.status);
          }
        } catch (error) {
          console.error("Error al iniciar llamada:", error);
          alert("Error de conexión al intentar llamar.");
        }
      });
    };

    // Helper para mostrar la Interfaz de Llamada
    const renderCallView = (remoteUser) => {
      chatArea.innerHTML = ""; // Limpiamos el chat
      const callComponent = new Call(remoteUser); // Instanciamos Call.js

      const callNode = callComponent.render();

      // Escuchamos cuando el usuario cuelgue para volver al chat
      callComponent.render().addEventListener("call:hangup", () => {
        console.log("Llamada finalizada, volviendo al chat...");
        if (this.selectedUser) {
          renderChatView();
        } else {
          chatArea.innerHTML = `<div class="no-user-selected"><p>Llamada finalizada</p></div>`;
        }
      });

      chatArea.appendChild(callNode);
    };

   //Llamadas entrantes por websocket
    const ws = WebSocketService.getInstance();

    ws.on('incomingCall', (data) => {
      const caller = data.callerName;
      console.log("Llamada entrante de:", caller);

      // Pequeño delay o confirmación visual
      if (confirm(`📞 ¡Llamada entrante de ${caller}! \n¿Aceptar?`)) {
        this.selectedUser = caller; // Seleccionamos al usuario que llama

        renderCallView(caller);
      }
    });


    // Renderizar la barra lateral (Lista de usuarios)
    const sidebar = new UserList(this.router, onUserSelected).render();

    container.append(sidebar, chatArea);
    box.append(header, container);

    return box;
  }
}