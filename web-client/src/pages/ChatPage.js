import axios from "axios";
import { Menu } from "../components/Menu.js";
import { UserList } from "../components/UserList.js";
import { Chat } from "../components/Chat.js";
import { Call } from "../components/Call.js";

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
    const chatArea = document.createElement("div");
    chatArea.classList.add("chat");

    chatArea.innerHTML = `
      <div class="no-user-selected">
        <p class="light-text">No ha seleccionado ningún usuario</p>
      </div>
    `;

    const onUserSelected = (username) => {
      this.selectedUser = username;
      chatArea.innerHTML = "";

      // Barra superior: botón Llamar + texto
      const topBar = document.createElement("div");
      topBar.classList.add("top-chat", "sidebar-text");

      const callButton = document.createElement("button");
      callButton.classList.add("call-button");
      callButton.textContent = "Llamar";

      const titleSpan = document.createElement("span");
      titleSpan.textContent = `Chat con ${username}`;

      topBar.appendChild(titleSpan);
      topBar.appendChild(callButton);

      chatArea.appendChild(topBar);

      // Chat por defecto
      const renderChat = () => {
        // limpiamos todo menos la barra superior
        chatArea.innerHTML = "";
        chatArea.appendChild(topBar);

        const chat = new Chat(this.selectedUser, false).render();
        chatArea.appendChild(chat);
      };

      renderChat();

      // Lógica del botón Llamar
      callButton.addEventListener("click", async () => {
        const sender = sessionStorage.getItem("username");
        const receiver = this.selectedUser;

        try {
          const response = await axios.post(
            "http://localhost:3001/start_call",
            { sender, receiver }
          );
          console.log("Respuesta del proxy /start-call:", response.data);

          titleSpan.textContent = `Llamando a ${username}...`;

          chatArea.innerHTML = "";
          chatArea.appendChild(topBar);

          const callComponent = new Call(receiver).render();

          // Escuchar cuando se cuelga
          callComponent.addEventListener("call:hangup", () => {
            titleSpan.textContent = `Chat con ${username}`;
            renderChat();
          });

          chatArea.appendChild(callComponent);
        } catch (error) {
          console.error("Error al iniciar la llamada:", error);
        }
      });
    };

    const sidebar = new UserList(this.router, onUserSelected).render();

    container.append(sidebar, chatArea);
    box.append(header, container);

    return box;
  }
}