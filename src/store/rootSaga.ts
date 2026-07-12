import { all, fork } from "redux-saga/effects";
import { authSaga } from "@/store/modules/auth/authSaga";
import { userSaga } from "@/store/modules/user/userSaga";
import { clientsSaga } from "@/store/modules/clients/clientsSaga";
import { leadsSaga } from "@/store/modules/leads/leadsSaga";
import { rolesSaga } from "@/store/modules/roles/rolesSaga";
import { meetingsSaga } from "@/store/modules/meetings/meetingsSaga";
import { documentsSaga } from "@/store/modules/documents/documentsSaga";
import { brdSaga } from "@/store/modules/brd/brdSaga";
import { proposalsSaga } from "@/store/modules/proposals/proposalsSaga";
import { agreementsSaga } from "@/store/modules/agreements/agreementsSaga";
import { sowSaga } from "@/store/modules/sow/sowSaga";

export default function* rootSaga() {
  yield all([fork(authSaga), fork(userSaga), fork(clientsSaga), fork(leadsSaga), fork(rolesSaga), fork(meetingsSaga), fork(documentsSaga), fork(brdSaga), fork(proposalsSaga), fork(agreementsSaga), fork(sowSaga)]);
}
