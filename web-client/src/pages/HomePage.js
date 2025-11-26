import axios from "axios";
import { WebSocketService } from "../services/WebSocketService.js";

export class HomePage {
  constructor(router) {
    this.router = router;
  }

  render() {
    const div = document.createElement("div");
    div.classList.add("home");
    div.innerHTML = `
      <h1 id="welcome">Bienvenid@</h1>
      <p id="descr">Este es un chat en línea para enviar mensajes a las personas conectadas</p>
      <div class="container" id="form">
        <input id ="username" class="font-text-input" type="text" placeholder="Ingresa el nombre con el que quieres aparecer" />
        <button id="enter" class="button-on-off" disabled>Entrar</button>
        <p id="error-message" style="color: red; margin-top: 10px; display: none;"></p>
        <div class="image-box">
        </div>
      </div>
    `;

    const input = div.querySelector("#username");
    const button = div.querySelector("#enter");
    const errorMsg = div.querySelector("#error-message");

    input.addEventListener("input", () => {
      if (input.value.trim() !== "") {
        button.classList.add("active");
        button.disabled = false;
      } else {
        button.classList.remove("active");
        button.disabled = true;
      }
      errorMsg.style.display = "none";
    });

    button.addEventListener("click", async () => {
      const name = input.value.trim();
      if (name) {
        sessionStorage.setItem("username", name);

        // 1. Registrar usuario en el Backend (Java) vía HTTP
        const success = await this.sendUserToServer(name);

        if(success) {
          // 2. Conectar WebSocket al Proxy (Node.js) para llamadas y tiempo real
          WebSocketService.getInstance().connect(name);

          // 3. Navegar al chat
          this.router.navigateTo("/chat");

        } else {
          errorMsg.textContent = "No se pudo registrar el usuario (posiblemente ya existe o servidor caído).";
          errorMsg.style.display = "block";
        }
      }
    });

    return div;
  }

  async sendUserToServer(name) {
    try {
      const userData = {
        name: name,
        online: true,
      };

      const response = await axios.post("http://localhost:3001/users", userData);

      console.log("Respuesta del proxy:", response.data);

      if (response.data.status === "ok") {
        console.log("Usuario registrado correctamente:", response.data.body);
        return true;
      } else {
        console.log("El servidor no aceptó el registro:", response.data.body);
        return false;
      }

    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      return false;
    }
  }
}
