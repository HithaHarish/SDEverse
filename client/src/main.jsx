import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "katex/dist/katex.min.css";
import { Provider } from "react-redux";
import store from "./app/store";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = "1024747703331-h67fj2kvrha764r7246s6hj3ls93krcr.apps.googleusercontent.com"; // 👈 paste from Google Cloud Console

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </Provider>
  </StrictMode>
);
