import { HomePage } from "../pages/HomePage.js";
import { ChatPage } from "../pages/ChatPage.js";
import { GroupPage } from "../pages/GroupPage.js";
import { CreateGroupPage } from "../pages/CreateGroupPage.js";
import { IncomingCallPage } from "../pages/IncomingCallPage.js";

export const routes = [
  { path: "/", component: HomePage },
  { path: "/chat", component: ChatPage },
  { path: "/groups", component: GroupPage },
  { path: "/create-group", component: CreateGroupPage },
  { path: "/incoming-call", component: IncomingCallPage },
];
