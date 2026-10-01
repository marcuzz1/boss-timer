import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

/**
 * Firebase 的 web 設定本來就是公開資訊（會跟著打包進前端），
 * 真正的存取控制在 Realtime Database 規則與 Discord 身分組驗證。
 * Client Secret 這類機密只存在 backend/functions 的 Secret Manager。
 */
const firebaseConfig = {
  apiKey: "AIzaSyAcJeu3tKJdgIFv62MEueYGTyHpyF_MCng",
  authDomain: "bosstimer-334d4.firebaseapp.com",
  databaseURL: "https://bosstimer-334d4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bosstimer-334d4",
  storageBucket: "bosstimer-334d4.firebasestorage.app",
  messagingSenderId: "826363753566",
  appId: "1:826363753566:web:cf25c8804271d7d2c430cf",
  measurementId: "G-1DRMKQ7SBX",
};

/** Cloud Functions 部署的區域，要跟 backend/functions 的設定一致 */
export const FUNCTIONS_REGION = "asia-east1";

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);
export const auth = getAuth(firebaseApp);
export const functions = getFunctions(firebaseApp, FUNCTIONS_REGION);
