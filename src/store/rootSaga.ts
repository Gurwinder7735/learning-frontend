import { all, fork } from "redux-saga/effects";
import { authSaga } from "@/store/modules/auth/authSaga";
import { userSaga } from "@/store/modules/user/userSaga";
import { clientsSaga } from "@/store/modules/clients/clientsSaga";
import { proposalsSaga } from "@/store/modules/proposals/proposalsSaga";

export default function* rootSaga() {
  yield all([fork(authSaga), fork(userSaga), fork(clientsSaga), fork(proposalsSaga)]);
}
