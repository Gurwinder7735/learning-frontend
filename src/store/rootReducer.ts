import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "@/store/modules/auth/authSlice";
import userReducer from "@/store/modules/user/userSlice";
import clientsReducer from "@/store/modules/clients/clientsSlice";
import proposalsReducer from "@/store/modules/proposals/proposalsSlice";
import leadsReducer from "@/store/modules/leads/leadsSlice";
import rolesReducer from "@/store/modules/roles/rolesSlice";
import meetingsReducer from "@/store/modules/meetings/meetingsSlice";
import proposalIntelligenceReducer from "@/store/modules/proposalIntelligence/proposalIntelligenceSlice";
import documentsReducer from "@/store/modules/documents/documentsSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  clients: clientsReducer,
  proposals: proposalsReducer,
  leads: leadsReducer,
  roles: rolesReducer,
  meetings: meetingsReducer,
  proposalIntelligence: proposalIntelligenceReducer,
  documents: documentsReducer,
});

export default rootReducer;
