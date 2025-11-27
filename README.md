# ChatApplication - Compunet1
#### Curso: Computación en Internet 1 - Universidad Icesi

<small>Santiago de Cali, Miércoles 26 de Noviembre de 2025</small>
### Integrantes:

- Isabella Candado
- Alejandro Murillo

## Tabla de Contenidos


  - [Descripción](#descripción)
  - [Configuración de Puertos](#configuración-de-puertos)
- [Guía para ejecutar el proyecto](#guía-para-ejecutar-el-proyecto)
  - [Requisitos](#requisitos)
  - [Paquetes de debes instalar](#paquetes-de-debes-instalar)
    - [Cliente web (Node.js)](#cliente-web-nodejs)
    - [Proxy (Node.js)](#proxy-nodejs)
  - [Comandos para ejecutar](#comandos-para-ejecutar)
    - [Server](#server)
    - [Proxy](#proxy)
    - [Web-client](#web-client)
- [Guía para ubicarse dentro de la página](#guía-para-ubicarse-dentro-de-la-página)
  - [Home Page](#home-page)
  - [Chat Page](#chat-page)
  - [Group Page](#group-page)
  - [Create Group Page](#create-group-page)
  - [Salir](#salir-de-la-página)
- [Estructura del proyecto](#estructura-del-proyecto)
  - [DTOS](#dtos)
  - [DAOS](#daos)
  - [Persistencia](#persistencia)
  - [Modelo](#modelo)
- [Flujo de comunicación](#flujo-de-comunicación)
  - [Registrar un usuario](#registrar-un-usuario)
  - [Crear un grupo](#crear-un-grupo)
  - [Enviar un mensaje](#enviar-un-mensaje)
  - [Obtener usuarios en línea](#obtener-usuarios-en-línea)
  - [Obtener grupos en los que el usuario es miembro](#obtener-grupos-en-los-que-el-usuario-es-miembro)
  - [Obtener los mensajes de un chat o un grupo](#obtener-los-mensajes-de-un-chat-o-un-grupo)
  - [Salir de la página](#salir-de-la-página)


## Descripción:

**ChatApplication** es una aplicación de mensajería web. Incorpora funcionalidades como:

- Registro de Usuarios.
- Creación de Grupos.
- Envío de mensajes de texto a Usuarios o a Grupos.
- Almacenamiento/Persistencia del historial de mensajes de los chats  (Texto y Audio).
- Envío de mensajes de voz a usuarios o a grupos
- Llamadas P2P y Grupales (Funcionalidad en desarrollo).

> Estas funciones están mapeadas en la aplicación por medio de diferentes páginas, las cuales se especifican más adelante en [Guía para ubicarse dentro de la página](#guía-para-ubicarse-dentro-de-la-página).

## Configuración de Puertos

Cada componente del proyecto se ejecuta en un puerto distinto en **localhost**:

| Componente      | Puerto | Descripción                                                       |
| --------------- | ------ |-------------------------------------------------------------------|
| **Cliente Web** | `3000` | Aplicación web del usuario final, servida por Webpack Dev Server. |
| **Proxy**       | `3001` | Puente entre el cliente web y el servidor Java.                   |
| **Servidor**    | `5000` | Backend principal del sistema, desarrollado en Java con Gradle.   |
| **Ice Server** |  `12000`| Server ZeroC Ice, utilizado para llamadas/audios P2P y grupales.  |
> **Notas:**
> - Asegúrate de que los puertos no estén ocupados por otros procesos.
> - Si necesitas modificarlos, puedes hacerlo:
>   - En el cliente, desde `webpack.config.js` (propiedad `devServer.port`).
>   - En el proxy, editando el archivo `proxy/Services.js`.
>   - En el servidor, ajustando el puerto configurado en la clase `Server.java`.

<br>

# Guía para ejecutar el proyecto

## Requisitos

Antes de ejecutar el proyecto, asegúrate de tener instalado lo siguiente:

- [Node.js](https://nodejs.org/) v22.14.0 o superior
- [Java JDK](https://adoptium.net/) 21 o superior
- [Gradle](https://gradle.org/) 9.0.0 o superior

## Paquetes de debes instalar

### Cliente web (Node.js)

Desde la raíz del proyecto, instala las dependencias necesarias:

```
npm i --save-dev webpack webpack-cli
npm i --save-dev webpack-dev-server
npm i --serve-dev html-webpack-plugin
npm i --save-dev style-loader css-loader
npm i axios
```

### Proxy (Node.js)

Desde la raíz del proyecto, instala las dependencias necesarias:

**Dependencia Ice**
```bash
npm install ice --save
```

**Dependencias Express, CORS y Axios**
```bash
cd proxy
npm i express cors axios
```

## Comandos para ejecutar

### Server

En una terminal limpia sobre la raíz del proyecto, ejecuta la siguiente línea de comandos:

```bash
cd server
gradle clean build 
java -jar build/libs/server.jar
```

Para confirmar que se ejecutó correctamente, debes ver en consola:
`Server running on port: 5000`

Adicionalmente, se efectúa la ejecución del hilo Ice Server en el puerto 12000. Deberás ver en la consola: `ZeroC Ice Server (Audio) running on endpoint: 12000`

### Proxy

En una terminal limpia sobre la raíz del proyecto, ejecuta la siguiente línea de comandos:

```bash
cd proxy
node Services.js
```

Para confirmar que se ejecutó correctamente, debes ver en consola:
`Proxy HTTP escuchando en http://localhost:3001`

### Web-client

En una terminal limpia sobre la raíz del proyecto, ejecuta la siguiente línea de comandos:

```bash
npx webpack serve
```

Para abrir la página web, deberás ir al enlace que sale tras ejecutar el comando.

```bash
[webpack-dev-server] Project is running at:
<i> [webpack-dev-server] Loopback: http://localhost:3000/
```


# Guía para ubicarse dentro de la página

## Home Page

La página principal del chat te recibe con una bienvenida y una pequeña descripción. 
En ella, verás un campo para ingresar el nombre de usuario con el que deseas entrar al chat. 
Luego de escribirlo, basta con presionar el botón de `Ingresar` para poder acceder a las funcionalidades del chat.

## Chat Page

Tan pronto ingreses, verás esta página. Puedes darte cuenta que estás en ella porque en el menú superior está resaltada la opción `Chat`.

Bajo el menú, a la izquierda, verás la lista de usuarios que están conectados, con los que podrás mensajear al presionar su nombre. 

> *Nota: Si no ves ninguno, es porque eres el único usuario conectado.*

En caso de haber hablado con ese usuario antes, podrás ver el historial de mensajes con ese usuario.

Para enviar un mensaje debes escribir el texto que deseas en la barra de texto al inferior de la pantalla y luego presionar el botón `Enviar`. 

## Group Page

Para ir a esta página, debes presionar la opción `Grupos` del menú. Puedes darte cuenta que estás en ella porque en el menú superior está resaltada la opción `Grupos`.

Bajo el menú, a la izquierda, verás la lista de grupos a los que perteneces, con los que podrás enviarles mensajes a todos los miembros al presionar el nombre del grupo. 

> *Nota: Si no ves ninguno, es porque no eres miembro de ningún grupo aún. **Te animamos a crear uno.***

En caso de haber hablado con ese grupo antes, podrás ver el historial de mensajes del grupo. Arriba de cada mensaje, podrás ver el emisor del mismo.

Para enviar un mensaje debes escribir el texto que deseas en la barra de texto al inferior de la pantalla y luego presionar el botón `Enviar`.

## Create Group Page

Para ir a esta página, debes presionar la opción `Nuevo grupo` que se encuentra en la parte inferior de la barra lateral de la página `Grupos`. Puedes darte cuenta que estás en ella porque en pantalla se ve **Crear un nuevo grupo**.

Verás un pequeño formulario, en el que debes ingresar el nombre del grupo y seleccionar, de los usuarios conectados, a quiénes quieres  incluir en el grupo. Para crear un grupo, **necesitas mínimo 3 usuarios (incluyéndote)**.

Luego de que la información esté lista, debes presionar el botón `Crear grupo` al final del formulario.
Luego se te dirigirá automáticamente a la página de Grupos para que puedas enviarle un mensaje a alguno.

## Salir de la página

Si quieres salir del chat, basta con presionar la opción del menú `Salir`. Con eso quedarás offline y no recibirás ni podrás envíar más mensajes.

# Estructura del proyecto

Es un multiproyecto, que incluye:

- ***web-client***: Cliente web implementado con HTML, CSS y JavaScript. Envía peticiones HTTP al proxy. Recibe la respuesta del **proxy** y renderiza en la página web.

- ***proxy***: Servidor HTTP que sirve como puente entre el **web-client** y el **server**. Recibe las peticiones del cliente
y las envía al **server** mediante *Sockets* usando `TCP`. Recibe las respuestas del **server** y le responde al **web-client**.

- ***server***: Servidor en Java, recibe los mensajes envíados por el **proxy** mediante los *Sockets*, interpreta la solicitud y la procesa según la acción indicada desde el proxy. Responde al **proxy** indicando si la solicitud se resolvió exitosamente o no.

## DTOS

Ruta: `server/src/main/java/dtos`

Para que el servidor entienda las peticiones y envíe una respuesta, se definieron las clases `Request.java` y `Response.java` para darle formato a los JSON que recibe y envía el server mediante los sockets.

```Java
public class Request {
  private String action;
  private JsonObject data;
  //Constructor, getters y setters
}
```

```Java
public class Response {
  private String status;
  private JsonObject data;
  //Constructor, getters y setters
}
```
El servidor obtiene el mensaje enviado desde el proxy y lo convierte a la clase `Request.java`. Maneja las peticiones con un `switch` dependiendo del `request.getAction()`. 

Para cada `action`, hace unas operaciones específicas, con ayuda de la clase `ServerServices.java` que usa los `DAOS` que manejan los datos del sistema.

## DAOS

Ruta: `server/src/main/java/daos`

Para almacenar los datos de la aplicación, se definió la interface `IDao.java`:

```Java
public interface IDao<K,V> {
    public List<K> findAllKeys();
    public List<V> findAllValues();
    public V finById(K id);
    public V update(V newEntity);
    public boolean delete(V entity);
    public V save(V entity);
}
```
Las clases `UserDao.java`, `GroupDao.java` y `MessageDao.java` implementan la interface y manejan los datos en memoria, con ayuda de `Map` para hacer consultas en $O(1)$

## Persistencia

Ruta: `server/src/main/java/persistence`

Ruta archivos: `server/data`

La persistencia se maneja con archivos JSON. 
Los **DAOS** se encargan de leer y escribir los archivos JSON con ayuda de la clase `JsonFileUtils.java` para mantener los datos que se almacenen al ejecutarse el proyecto.

## Modelo 

Ruta: `server/src/main/java/model`

Se definen las entidades:

```Java
public class User {
  private String name;
  private boolean online;
  //Constructor, getters y setters
}
```

```Java
public class Group {
  private String name;
  private List<String> members;
  //Constructor, getters y setters
}
```

```Java
public class Message {
  private String sender;
  private String receiver;
  private String message;
  //Constructor, getters y setters
}
```

```Java
public class Pair {
  //Clase útil para las claves (sender, receiver) del MessageDao

  private final A first;
  private final B second;
  //Constructor, getters y setters
}
```
<br>

# Flujo de comunicación 

## Registrar un usuario

### Web-client

Desde la `HomePage.js`, se obtiene el input de la barra de texto cuando el usuario presiona el botón `Ingresar`, y se llama al endpoint del proxy

```JavaScript
const userData = {
        name: name,
        online: true,
      };

const response = await axios.post("http://localhost:3001/users", userData);
```

### Proxy

El proxy expone el endpoint:

```JavaScript
app.post("/users", (req, res) => {
  const userData = req.body;
  //implementación del endpoint
})
```
En el que se conecta con el servidor y le envía:

```JavaScript
const message = JSON.stringify({
      action: "register_user",
      data: userData,
    });
```

###  Server

Recibe la solicitud del **proxy** y obtiene el `action` de la solicitud, luego llama al método de `ServeraServices.java` apropiado.

En caso de que el usuario ya esté almacenado en el **DAO**, se acualiza su estado a `online = true`. 

Si no, se guarda la infomación del nuevo usuario. 

En caso de que todo salga bien, el server envía la respuesta:

```JSON
{
  "status": "ok",
  "data": //información del nuevo usuario
}
```
Si ocurrió un error:

```JSON
{
  "status": "error",
  "data": "User registration failed"
}
```

## Crear un grupo

### Web-client

Desde la `CreateGroupPage.js`, se obtiene el input de la barra de texto con el nombre del grupo y los usuarios seleccionados cuando el usuario presiona el botón `Crear grupo`, y se llama al endpoint del proxy

```JavaScript
const payload = { name: groupName, members };
const response = await axios.post("http://localhost:3001/create-group", payload);
```

### Proxy

El proxy expone el endpoint:

```JavaScript
app.post("/create-group", (req, res) => {
  const groupData = req.body;
  //implementación del endpoint
})
```
En el que se conecta con el servidor y le envía:

```JavaScript
const message = JSON.stringify({
  action: "create_group",   
  data: groupData,        
});
```

###  Server

Recibe la solicitud del **proxy** y obtiene el `action` de la solicitud, luego llama al método de `ServeraServices.java` apropiado.

En caso de que todo salga bien, el server envía la respuesta:

```JSON
{
  "status": "ok",
  "data": //información del nuevo grupo
}
```
Si ocurrió un error:

```JSON
{
  "status": "error",
  "data": "Group registration failed"
}
```

## Enviar un mensaje

### Web-client

Desde el componente `MessageInput.js`, se obtiene el input de la barra de texto con el contenido del mensaje cuando el usuario presiona el botón `Enviar`, y se llama al endpoint del proxy

```JavaScript
const messageData = {
  sender,
  receiver,
  message: text,
}

const response = await axios.post("http://localhost:3001/add_message", messageData);
```
> Nota: el `receiver` puede ser el nombre de un usuario o el nombre de un grupo

### Proxy

El proxy expone el endpoint:

```JavaScript
app.post("/add_message", (req, res) => {
  const messageData = req.body;
  //implementación del endpoint
})
```
En el que se conecta con el servidor y le envía:

```JavaScript
const message = JSON.stringify({
      action: "add_message",   
      data: messageData,        
});
```

###  Server

Recibe la solicitud del **proxy** y obtiene el `action` de la solicitud, luego llama al método de `ServeraServices.java` apropiado.

En caso de que todo salga bien, el server envía la respuesta:

```JSON
{
  "status": "ok",
  "data": //información del nuevo mensaje
}
```
Si ocurrió un error:

```JSON
{
  "status": "error",
  "data": "Message registration failed"
}
```

## Obtener usuarios en línea

### Web-client

Desde el componente `ChatList.js`, se llama al endpoint del proxy

```JavaScript
const response = await axios.get("http://localhost:3001/users", {
        params: {username}
      });
```

### Proxy

El proxy expone el endpoint:

```JavaScript
app.get("/users", (req, res) => {
  //implementación del endpoint
})
```
En el que se conecta con el servidor y le envía:

```JavaScript
const message = JSON.stringify({
      action: "get_online_users",
    });
```

###  Server

Recibe la solicitud del **proxy** y obtiene el `action` de la solicitud, luego llama al método de `ServeraServices.java` apropiado.

En caso de que todo salga bien y haya más de un usuario registrado, el server envía la respuesta:

```JSON
{
  "status": "ok",
  "data": //lista con todos los usuarios que tengan online=true
}
```
Si solo hay un usuario registrado:

```JSON
{
  "status": "warning",
  "data": "Only one user registered"
}
```
Si ocurrió un error:

```JSON
{
  "status": "error",
  "data": "Get users online failed"
}
```

## Obtener grupos en los que el usuario es miembro

### Web-client

Desde el componente `GroupList.js`, se llama al endpoint del proxy

```JavaScript
const response = await axios.get("http://localhost:3001/groups", {
        params: {username}
      });
```

### Proxy

El proxy expone el endpoint:

```JavaScript
app.get("/groups", (req, res) => {
  //implementación del endpoint
})
```
En el que se conecta con el servidor y le envía:

```JavaScript
const message = JSON.stringify({
      action: "get_user_groups",
    });
```

###  Server

Recibe la solicitud del **proxy** y obtiene el `action` de la solicitud, luego llama al método de `ServeraServices.java` apropiado.

En caso de que todo salga bien y el usuario sea miembro de algún grupo, el server envía la respuesta:

```JSON
{
  "status": "ok",
  "data": //lista con todos los grupos a los que pertenece el usuario
}
```
Si no es miembro de ningún grupo:

```JSON
{
  "status": "warning",
  "data": "username is not a member of any group"
}
```
Si ocurrió un error:

```JSON
{
  "status": "error",
  "data": "Get groups failed" 
}
```

## Obtener los mensajes de un chat o un grupo

### Web-client

Desde el componente `Chat.js`, se llama al endpoint del proxy

```JavaScript
const response = await axios.get("http://localhost:3001/get_messages", {
          params: { sender, receiver: this.receiver },
        });
```
> Nota: el `receiver` puede ser el nombre de un usuario o el nombre de un grupo

### Proxy

El proxy expone el endpoint:

```JavaScript
app.get("/get_messages", (req, res) => {
  const sender = req.query.sender;
  const receiver = req.query.receiver;
  const data = { sender, receiver };
  //implementación del endpoint
})
```
En el que se conecta con el servidor y le envía:

```JavaScript
const message = JSON.stringify({
      action: "get_messages",
      data: data
    });
```

###  Server

Recibe la solicitud del **proxy** y obtiene el `action` de la solicitud, luego llama al método de `ServeraServices.java` apropiado.

En caso de que todo salga bien y el chat tenga mensajes guardados, el server envía la respuesta:

```JSON
{
  "status": "ok",
  "data": //lista con todos los mensajes del chat
}
```
Si no el chat no tiene mensajes:

```JSON
{
  "status": "warning",
  "data": "sender and receiver haven't messages yet"
}
```
Si ocurrió un error:

```JSON
{
  "status": "error",
  "data": "Get messages failed"
}
```

## Salir de la página

### Web-client

Desde el componente `Menu.js`, al presionar la opción `Salir` se llama al endpoint del proxy

```JavaScript
const userData = {
        name: username,
        online: false
      };

const response = await axios.put("http://localhost:3001/users/status", userData);
```

### Proxy

El proxy expone el endpoint:

```JavaScript
app.put("/users/status", (req, res) => {
  const userData = req.body;
  //implementación del endpoint
})
```
En el que se conecta con el servidor y le envía:

```JavaScript
const message = JSON.stringify({
      action: "logout_user",
      data: userData,
    });
```

###  Server

Recibe la solicitud del **proxy** y obtiene el `action` de la solicitud, luego llama al método de `ServeraServices.java` apropiado.

En caso de que todo salga bien, el server envía la respuesta:

```JSON
{
  "status": "ok",
  "data": //información del usuario actualizada
}
```
Si ocurrió un error:

```JSON
{
  "status": "error",
  "data": "User update failed"
}
```