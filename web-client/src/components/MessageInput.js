import axios from "axios";

export class MessageInput {
  constructor(chat) {
    this.chat = chat;
  }

  render() {
    const div = document.createElement("div");
    div.classList.add("message-input");
    div.innerHTML = `
      <input id="msg" class="font-text-input" type="text" placeholder="Escribe un mensaje">
      <button id="send" class="button-on-off" disabled>Enviar</button>
    `;

    const input = div.querySelector("#msg");
    const button = div.querySelector("#send");

    input.addEventListener("input", () => {
      const text = input.value.trim();
      button.disabled = text === "";
      button.classList.toggle("active", text !== "");
    });

    button.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) return;

      const sender = sessionStorage.getItem("username");
      const receiver = this.chat.receiver;

      try {
        const response = await axios.post("http://localhost:3001/add_text", {
          sender,
          receiver,
          message: text,
        });
        console.log("Respuesta del proxy:", response.data);

        input.value = "";
        button.disabled = true;
        button.classList.remove("active");

        this.chat.loadMessages();

      } catch (error) {
        console.error("Error al enviar mensaje:", error);
      }
    });

    return div;
  }
}
