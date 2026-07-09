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
import brdReducer from "@/store/modules/brd/brdSlice";
import agreementsReducer from "@/store/modules/agreements/agreementsSlice";
import sowReducer from "@/store/modules/sow/sowSlice";

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
  brd: brdReducer,
  agreements: agreementsReducer,
  sow: sowReducer,
});

export default rootReducer;
