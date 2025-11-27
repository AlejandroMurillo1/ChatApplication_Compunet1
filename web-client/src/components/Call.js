import axios from "axios";

export class Call {
  constructor(receiver, sessionId) {
    this.receiver = receiver;
    this.sessionId = sessionId;
  }

  render() {
    const wrapper = document.createElement("div");
    wrapper.classList.add("call-container");

    // Zona principal con la info de la llamada
    const info = document.createElement("div");
    info.classList.add("call-info");

    const name = document.createElement("div");
    name.classList.add("call-name");
    name.textContent = this.receiver;

    const status = document.createElement("div");
    status.classList.add("call-status");
    status.textContent = "Llamando...";

    info.appendChild(name);
    info.appendChild(status);

    // Barra inferior con el botón de colgar
    const bottomBar = document.createElement("div");
    bottomBar.classList.add("call-bottom-bar");

    const hangupBtn = document.createElement("button");
    hangupBtn.classList.add("call-end-button");
    hangupBtn.setAttribute("title", "Colgar");
    hangupBtn.innerHTML = `<span class="call-end-icon ">Colgar</span>`;

    hangupBtn.addEventListener("click", async () => {
      const userId = sessionStorage.getItem("username");
      const receiver = this.receiver;

      try {
        const response = await axios.post(
          "http://localhost:3001/end_call",
            { userId, sessionId: this.sessionId }
        );
        console.log("Respuesta del proxy /end_call:", response.data);
      } catch (error) {
        console.error("Error al terminar la llamada:", error);
      }

      // Avisar al padre que se colgó la llamada
      const event = new CustomEvent("call:hangup", {
        detail: { receiver: this.receiver },
      });
      wrapper.dispatchEvent(event);
    });

    bottomBar.appendChild(hangupBtn);

    wrapper.appendChild(info);
    wrapper.appendChild(bottomBar);

    return wrapper;
  }
}
