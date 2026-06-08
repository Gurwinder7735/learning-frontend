import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "@/store/modules/auth/authSlice";
import userReducer from "@/store/modules/user/userSlice";
import clientsReducer from "@/store/modules/clients/clientsSlice";
import proposalsReducer from "@/store/modules/proposals/proposalsSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  clients: clientsReducer,
  proposals: proposalsReducer,
});

export default rootReducer;
