import React, { Component, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Prompt } from 'react-router';
import { Form, Icon } from 'antd';
import { I18n } from 'react-i18next';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import {
  GetMedications,
  CompleteReport,
  ChangeReportStatus,
  AddNotes,
  GetSingleReport,
  PostMedication,
  CompleteReportPatch,
  MarkReportAsApproved,
} from '../../../sources/PatientMedication';
import BGLMedicationReport from './BGLMedicationReport';
import MedicationData from './MedicationData/MedicationData';
import BGLPlanComponent from '../../PatientDashboard/BGLPlan/BGLPlanComponent';
import '../../../../styles/bootstrap.css';
import moment from 'moment';
import cloneDeep from 'lodash/cloneDeep';
import { BGLGetResource, saveNewBGLRanges } from '../../../sources/PatientBGLRangesSource';
import BGLMonitrotingData from './BGLMonitoringData';
import isEmpty from 'lodash/isEmpty';
import store from '../../../../store/store';
import {
  calculateBMI,
  getProfilePicture,
  isEnglishLanguageCode,
  isArabicLanguageCode,
  getRole,
  formatDate,
  getStatus,
} from '../../../../utils/utils';
import { getSettingsItem } from '../../../../utils/storageUtils';
import { weightConverter, getUnitEnum } from '../../../../shared/components/settings/settingsUtil';
import { YY_MM_DD } from '../../../sources/Constants';
import get from 'lodash.get'

// let tabs;
let medButton;
let bglEdit;
let sentToId;
let assignedToTypeId;
let assignedToName;
let payloadForFullReport = null;
let payloadForNote = null;
let sendToName;
let noteAttached = false;
class MedicationReport extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loggedInUserId: get(this.props, 'location.state.loggedInUserId', ''),
      note: '',
      note1: '',
      displayNotes: [],
      showMyNote: false,
      sendNoteButtonClicked: false,
      activeTab: 1,
      activeTab1: 1,
      value: 'DOCTOR',
      reportExists: false,
      assignedToName: '',
      assignedToTypeId: '',
      assignedToRole: '',
      // createByName: '', not being used
      createdByRole: '',
      // timeOfReportCreation: '',  unnecessary state
      responseData: [],
      reportData: [],
      from: '',
      modal: false,
      backdrop: 'static',
      showWarningMessage: false,
      patientRanges: [],
      isSenderChange: false,
      reportLocked: false,
      canEditReport: true,
      snapshotReport: false,
      editButtonClicked: false,
      doctorApprovedOrRejected: false,
      showPrompt: false,
      isSuggestedMedicationUpdated: false,
      isSuggestedMonitoringUpdated: false,
      // updatedBGLRanges: [], unecessary state
      showApprovePopup: false,
      showWarningMessageOnCancel: false,
      showCreatePopup: false,
      isSendLoading: false,
    };
    this.toggle = this.toggle.bind(this);
    this.toggleWarningMessageOnCancel = this.toggleWarningMessageOnCancel.bind(this);
  }

  componentDidMount() {
    payloadForFullReport = null;
    payloadForNote = null;
    noteAttached = false;
    const stateRole =
      get(this.props, 'location.state.role')
        ? this.props.location.state.role
        : store.getState().auth.userDetails.roles[0];

    const reportId =
      this.props.location && this.props.location.state && this.props.location.state.reportId
        ? this.props.location.state.reportId
        : null;

    const assignedToTypeId = this.props.location;

    if (assignedToTypeId) {
      this.setState({
        note: '',
        value: assignedToTypeId === 3 ? 'DIETITIAN' : 'DOCTOR',
      });
    } else {
      this.setState({
        note: '',
      });
    }
    if (sessionStorage.getItem('sendingReportTo'))
      this.setState({ value: sessionStorage.getItem('sendingReportTo') });
    // if(this.props.location && this.props.location.state && this.props.location.state.noteData && !this.props.location.state.reportId){
    if (this.props.location && this.props.location.state && this.props.location.state.noteData) {
      noteAttached = true;
      this.setState({ displayNotes: this.props.location.state.noteData, showMyNote: true });
      payloadForNote = { reportNotes: [] };
      payloadForNote.reportNotes = this.props.location.state.noteData;
    }

    const lang = localStorage.getItem('i18nextLng');
    GetMedications(
      this.props.match.params.id,
      res => {
        const reportId =get(this.props, 'location.state.reportId', null);
        const finalData = get(this.props, 'location.state.finalData', null);
        const loggedInUserRole = store.getState().auth.userDetails.roles[0];
        if (res && loggedInUserRole === 'ROLE_DOCTOR' && !isEmpty(finalData)) {
          res[0] = finalData.medications; // setting current medications when creates a report..
        }

        this.setState({
          responseData: res,
        });
      },
      err => {
        console.log('err', err);
      },
    );

    BGLGetResource(
      this.props.match.params.id,
      res => {
        const reportId = get(this.props, 'location.state.reportId', null);
        const suggestedBGLRanges = get(this.props, 'location.state.suggestedBGLRanges', null);
        const loggedInUserRole = store.getState().auth.userDetails.roles[0];
        if (
          res &&
          !reportId &&
          loggedInUserRole === 'ROLE_DOCTOR' &&
          !isEmpty(suggestedBGLRanges) &&
          !isEmpty(suggestedBGLRanges.bglRanges)
        ) {
          res[0].bglRanges = suggestedBGLRanges.bglRanges; // setting current medications when creates a report..
        }
        this.setState({ patientRanges: res });
      },
      err => {
        console.log('err', err);
      },
    );
    if (this.props.location.state) {
      if (this.props.location.state.from) {
        this.setState({
          from: this.props.location.state.from,
        });
      }
      if (get(this.props, 'location.state.reportId')) {
        GetSingleReport(this.props.location.state.reportId, res => {
          const activeTab =
            !isEmpty(res) &&
              !isEmpty(res.suggestedMedication) &&
              !isEmpty(res.suggestedMedication.medications)
              ? 1
              : 2;
          const activeTab1 =
            !isEmpty(res) && !isEmpty(res.suggestedBgl) && !isEmpty(res.suggestedBgl.bglRanges)
              ? 1
              : 2;
          if (!res.read &&
            get(this.props, 'location.state.role') === 'ROLE_EDUCATOR' &&
            res.createdByRole === 'ROLE_DOCTOR' &&
            !res.snapshot) {
            MarkReportAsApproved(
              { read: true, reportId: this.props.location.state.reportId },
              res => {
                console;
              },
              err => {
                console.log('err', err);
              },
            );
          }
          this.setState(
            {
              activeTab,
              activeTab1,
              reportData: res,
              from: this.props.location.state.from,
              createdByRole: res.createdByRole,
              createdByName: res.createdByName,
              reportLocked: 'lockedById' in res,
              canEditReport: res.status == 8 || res.status == 5 || res.status == 10,
              snapshotReport: res.snapshot, // first make sure that there is already something in the report that can be edited
            },
            () => {
              this.setState({ 
                reportExists: true,
                assignedToName: res.assignedToName,
                assignedToTypeId: res.assignedToTypeId,
                createdByName: res.createdByName,
                createdByRole: res.createdByRole,
                timeOfReportUpdate: moment(res.updatedAt).format(YY_MM_DD) ,
                assignedToRole:
                  res.assignedToTypeId === 1
                    ? 'ROLE_DOCTOR'
                    : res.assignedToTypeId === 2
                      ? 'ROLE_EDUCATOR'
                      : 'ROLE_DIETICIAN',
              });

              if (
                get(this.props, 'location.state')
              ) {
                if (
                  this.props.location.state.suggestedBGLRanges &&
                  this.props.location.state.suggestedBGLRanges.bglRanges
                ) {
                  if (
                    this.state.reportData.suggestedBgl &&
                    this.state.reportData.suggestedBgl.bglRanges
                  ) {
                    if (
                      this.props.location.state.suggestedBGLRanges.bglRanges.length !==
                      this.state.reportData.suggestedBgl.bglRanges.length
                    )
                      this.setState({ isSuggestedMonitoringUpdated: true, showPrompt: true });
                    else {
                      for (
                        var i = this.props.location.state.suggestedBGLRanges.bglRanges.length - 1;
                        i >= 0;
                        i--
                      ) {
                        var objectsAreSame = false;
                        for (
                          var j = this.state.reportData.suggestedBgl.bglRanges.length - 1;
                          j >= 0;
                          j--
                        ) {
                          if (
                            this.state.reportData.suggestedBgl.bglRanges[j].maximum ===
                            this.props.location.state.suggestedBGLRanges.bglRanges[i].maximum &&
                            this.state.reportData.suggestedBgl.bglRanges[j].minimum ===
                            this.props.location.state.suggestedBGLRanges.bglRanges[i].minimum &&
                            this.state.reportData.suggestedBgl.bglRanges[j].title.en ===
                            this.props.location.state.suggestedBGLRanges.bglRanges[i].title.en &&
                            this.state.reportData.suggestedBgl.bglRanges[j].frequency ===
                            this.props.location.state.suggestedBGLRanges.bglRanges[i].frequency
                          ) {
                            objectsAreSame = true;
                            break;
                          }
                          if (j === 0)
                            this.setState({ showPrompt: true, isSuggestedMonitoringUpdated: true });
                        }
                      }
                    }
                  } else this.setState({ isSuggestedMonitoringUpdated: true, showPrompt: true }); // you added mon to a report that did not have any suggested mon in the first place
                }
                if (
                  this.props.location.state.finalData &&
                  this.props.location.state.finalData.medications
                ) {
                  if (
                    this.state.reportData.suggestedMedication &&
                    this.state.reportData.suggestedMedication.medications
                  ) {
                    if (
                      this.state.reportData.suggestedMedication.medications.length !==
                      this.props.location.state.finalData.medications.length
                    )
                      this.setState({ showPrompt: true, isSuggestedMedicationUpdated: true });
                    else {
                      for (
                        i = this.state.reportData.suggestedMedication.medications.length - 1;
                        i >= 0;
                        i--
                      ) {
                        objectsAreSame = false;
                        for (
                          j = this.props.location.state.finalData.medications.length - 1;
                          j >= 0;
                          j--
                        ) {
                          if (
                            this.props.location.state.finalData.medications[j].medicineId &&
                            this.state.reportData.suggestedMedication.medications[i].medicineId &&
                            this.props.location.state.finalData.medications[j].medicineId ===
                            this.state.reportData.suggestedMedication.medications[i].medicineId
                          ) {
                            if (
                              this.props.location.state.finalData.medications[j].dosageOptions &&
                              this.props.location.state.finalData.medications[j].dosageOptions
                                .length &&
                              this.state.reportData.suggestedMedication.medications[i]
                                .dosageOptions &&
                              this.state.reportData.suggestedMedication.medications[i].dosageOptions
                                .length
                            ) {
                              for (
                                let p =
                                  this.state.reportData.suggestedMedication.medications[i]
                                    .dosageOptions.length - 1;
                                p >= 0;
                                p--
                              ) {
                                for (
                                  let q =
                                    this.props.location.state.finalData.medications[j].dosageOptions
                                      .length - 1;
                                  q >= 0;
                                  q--
                                ) {
                                  if (
                                    this.state.reportData.suggestedMedication.medications[i]
                                      .dosageOptions[p].dosageQuantityId ===
                                    this.props.location.state.finalData.medications[j]
                                      .dosageOptions[q].dosageQuantityId &&
                                    this.state.reportData.suggestedMedication.medications[i]
                                      .dosageOptions[p].dosageTimeValue ===
                                    this.props.location.state.finalData.medications[j]
                                      .dosageOptions[q].dosageTimeValue
                                  ) {
                                    objectsAreSame = true;
                                  } else {
                                    objectsAreSame = false;
                                  }
                                  if (!objectsAreSame) break;
                                }
                              }
                              if (objectsAreSame) break;
                            }
                          }
                          if (j === 0) {
                            this.setState({ showPrompt: true, isSuggestedMedicationUpdated: true });
                          }
                        }
                      }
                    }
                  } else this.setState({ showPrompt: true, isSuggestedMedicationUpdated: true });
                }
              }
            },
          );
        });
      } else {
        let activeTab =
            !isEmpty(get(this.props, 'location.state.finalData.medications'))
            ? 1
            : 2;
        let activeTab1 =
            !isEmpty(get(this.props, 'location.state.suggestedBGLRanges.bglRanges'))
            ? 1
            : 2;
        if (activeTab === 1)
          this.setState({ isSuggestedMedicationUpdated: true, showPrompt: true });
        if (activeTab1 === 1)
          this.setState({ isSuggestedMonitoringUpdated: true, showPrompt: true });

        const reportId =get(this.props, 'location.state.reportId', null);
        const finalData = get(this.props, 'location.state.finalData', null);
        const loggedInUserRole = store.getState().auth.userDetails.roles[0];
        const suggestedBGLRanges = get(this.props, 'location.state.suggestedBGLRanges', null)

        if (
          !reportId &&
          loggedInUserRole === 'ROLE_DOCTOR' &&
          !isEmpty(finalData) &&
          !isEmpty(finalData.medications)
        ) {
          activeTab = 2;
        }
        if (
          !reportId &&
          loggedInUserRole === 'ROLE_DOCTOR' &&
          !isEmpty(suggestedBGLRanges) &&
          !isEmpty(suggestedBGLRanges.bglRanges)
        ) {
          activeTab1 = 2;
        }

        this.setState({
          activeTab,
          activeTab1,
          createdByRole: this.props.location.state.role,
        });
      }

      if (this.props.location.state.from === 'dashboard') {
        if (isEnglishLanguageCode(lang)) {
          this.tabs = [
            {
              id: 1,
              text: 'Suggested Medication',
            },
            {
              id: 2,
              text: 'Current Medication',
            },
            {
              id: 3,
              text: 'Previous Medication',
            },
          ];
          this.tabs1 = [
            {
              id: 1,
              text: 'Suggested Monitoring',
            },
            {
              id: 2,
              text: 'Current Monitoring',
            },
            {
              id: 3,
              text: 'Previous Monitoring',
            },
          ];
        } else {
          this.tabs = [
            {
              id: 1,
              text: 'الأدوية المقترحة',
            },
            {
              id: 2,
              text: 'الأدوية الحالية',
            },
            {
              id: 3,
              text: 'الأدوية السابقة',
            },
          ];
          this.tabs1 = [
            {
              id: 1,
              text: 'المراقبة المقترحة',
            },
            {
              id: 2,
              text: 'المراقبة الحالية',
            },
            {
              id: 3,
              text: 'المراقبة السابقة',
            },
          ];
        }
      } else {
        const config = {
          textMargin: 'ml-3',
        };

        if (isArabicLanguageCode(lang)) {
          config.textMargin = 'mr-3';
        }
        medButton = (
          <I18n ns="translations">
            {t => (
              <button
                className="btn btn-white border float-right px-4"
                onClick={() => {
                  this.editMedication(
                    this.props.location.state && this.props.location.state.currentPatientDetails
                      ? this.props.location.state.currentPatientDetails.fullName
                      : '',
                    this.props.match.params.id,
                    this.state.responseData[0],
                    this.props.location.state.role,
                    this.props.location.state.educatorName,
                    this.props.location.state.doctorName,
                    this.props.location.state.doctorSentToId,
                    this.props.location.state.educatorSentToId,
                    this.props.dieticianSentToId,
                    this.props.location.state.reportId,
                    this.props.location.state.currentPatientDetails,
                    get(this.props, 'location.state.suggestedBGLRanges'),
                  );
                }}
              >
                <Icon type="edit" />
                <span className={`${config.textMargin}`}>{t('EDIT')}</span>
              </button>
            )}
          </I18n>
        );
        if (isEnglishLanguageCode(lang)) {
          this.tabs = [
            {
              id: 1,
              text: 'Suggested Medication',
            },
            {
              id: 2,
              text: 'Current Medication',
            },
            {
              id: 3,
              text: 'Previous Medication',
            },
          ];
          this.tabs1 = [
            {
              id: 1,
              text: 'Suggested Monitoring',
            },
            {
              id: 2,
              text: 'Current Monitoring',
            },
            {
              id: 3,
              text: 'Previous Monitoring',
            },
          ];
        } else {
          this.tabs = [
            {
              id: 1,
              text: 'الادوية المقترحة',
            },
            {
              id: 2,
              text: 'الأدوية الحالية',
            },
            {
              id: 3,
              text: 'الأدوية السابقة',
            },
          ];
          this.tabs1 = [
            {
              id: 1,
              text: 'المراقبة المقترحة',
            },
            {
              id: 2,
              text: 'المراقبة الحالية ',
            },
            {
              id: 3,
              text: 'المراقبة السابقة',
            },
          ];
        }
      }
    } else {
      this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
    }
    if (!(reportId && reportId !== null && reportId !== '')) {
      const selectedReportHCP =
        this.props.location &&
          this.props.location.state &&
          this.props.location.state.selectedReportHCP
          ? this.props.location.state.selectedReportHCP
          : '';
      this.setState({
        value: selectedReportHCP || (stateRole === 'ROLE_EDUCATOR' ? 'DOCTOR' : 'DIETITIAN'),
      });
      // this.setState({
      //   value: stateRole === 'ROLE_EDUCATOR'? 'DOCTOR': 'DIETITIAN'
      // });
    }
  }

  componentWillUnmount() {
    if (!this.state.editButtonClicked) {
      const reportId = get(this.props, 'location.state.reportId', '')
      const { doctorApprovedOrRejected, reportData } = this.state;
      if (!doctorApprovedOrRejected && reportId && reportData.status === 3) {
        ChangeReportStatus(
          {
            reportId,
            statusId: 13,
          },
          res => {
            console.log('report status changed ');
            console.log(res);
          },
          err => {
            console.log('err', err);
          },
        );
      }
    }
  }

  setRecepient = (recepientType, event) => {
    assignedToTypeId = recepientType;
    this.setState(
      {
        isSenderChange: true,
        value: event.target.value,
      },
      () => {
        sessionStorage.setItem('sendingReportTo', this.state.value);
      },
    );
  };

  toggle() {
    this.setState({
      modal: !this.state.modal,
    });
  }

  toggleWarningMessage = () => {
    this.setState({
      showWarningMessage: !this.state.showWarningMessage,
    });
  };

  toggleWarningMessageOnCancel() {
    this.setState({
      showWarningMessageOnCancel: !this.state.showWarningMessageOnCancel,
    });
  }

  messageTime = () => {
    let date = new Date();
    let monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    let strTime = `${formatDate(date)} at ${moment(date).format('h:mm a')}`;
    return strTime;
  };

  handleNote = event => {
    if (event.target.value === '') {
      // payloadForNote = null;
      this.setState({
        note: event.target.value,
        sendNoteButtonClicked: true,
      });
    } else {
      const res = event.target.value.split(' ');
      if (res.length >= 100) {
        return;
      }
      this.setState({ note: event.target.value, sendNoteButtonClicked: false }, () => {
        // const note = this.state.note1 === '' ? event.target.value : this.state.note1;

        const role = this.props.location.state.role;
        if (role === 'ROLE_EDUCATOR') {
          sentToId = this.props.location.state.doctorSentToId;
        } else if (role === 'ROLE_DOCTOR') {
          sentToId = this.props.location.state.educatorSentToId;
        } else if (role === 'ROLE_DIETICIAN') {
          sentToId = this.props.location.state.doctorSentToId;
        }
        noteAttached = true;
        // payloadForNote = {
        //   reportNotes:
        //     [
        //       {
        //         noteBody: this.state.note, noteType: 2, patientId, sentToId, title: 'REPORT_TITLE',
        //       },
        //     ],
        // };

        // payloadForFullReport.reportNotes = payloadForNote.reportNotes;
      });
    }
  };

  sendMessage = e => {
    e.preventDefault();
    if (this.state.note !== '') {
      this.setState(
        () => ({
          note: '',
          note1: this.state.note,
          sendNoteButtonClicked: true,
        }),
        () => {
          this.sendMessagePartCallBack();
        },
      );
    }
  };

  sendMessagePartCallBack = () => {
    const { note1 } = this.state;
    const patientId = this.props.match.params.id;
    const { role } = this.props.location.state;
    if (role === 'ROLE_EDUCATOR') {
      sentToId = this.props.location.state.doctorSentToId;
    } else if (role === 'ROLE_DOCTOR') {
      sentToId = this.props.location.state.educatorSentToId;
    } else if (role === 'ROLE_DIETICIAN') {
      sentToId = this.props.location.state.doctorSentToId;
    }
    if (payloadForNote) {
      if (payloadForNote.reportNotes) {
        payloadForNote.reportNotes.push({
          noteBody: note1,
          noteType: 2,
          patientId,
          sentToId,
          title: 'REPORT_TITLE',
          messageTime: this.messageTime(),
        });
      } else {
        payloadForNote = {
          reportNotes: [
            {
              noteBody: note1,
              noteType: 2,
              patientId,
              sentToId,
              title: 'REPORT_TITLE',
              messageTime: this.messageTime(),
            },
          ],
        };
      }
    } else {
      payloadForNote = {
        reportNotes: [
          {
            noteBody: note1,
            noteType: 2,
            patientId,
            sentToId,
            title: 'REPORT_TITLE',
            messageTime: this.messageTime(),
          },
        ],
      };
    }
    payloadForFullReport.reportNotes = payloadForNote.reportNotes;
    this.setState({
      displayNotes: payloadForFullReport.reportNotes,
    });
    // payloadForFullReport.reportNotes.push({ noteBody: note1, noteType: 2, patientId, sentToId, title: 'REPORT_TITLE'});
    if (note1) {
      noteAttached = true;
      this.props.form.validateFields(err => {
        if (err === null) {
          const reportId =
            this.props.location && this.props.location.state && this.props.location.state.reportId
              ? this.props.location.state.reportId
              : '';
          // if (this.props.match && this.props.match.params && this.props.match.params.id) {
          if (reportId) {
            const newNote = {
              noteBody: note1, // messages??? on report
              noteType: 2, // 2 means Note for reports
              patientId, // patient id
              reportId, // respective report id
              sentToId, // respective recipient id
              title: 'REPORT_TITLE', // For Reports, REPORT_TITLE as there is no specific title for notes
            };
            let oldReportData;
            AddNotes(
              newNote,
              res => {
                oldReportData = cloneDeep(this.state.reportData);
                oldReportData.reportNotes ? oldReportData.reportNotes.push(res) : '';
                this.setState({ showMyNote: true, reportData: oldReportData, note: '' });
              },
              err => {
                console.log('err', err);
              },
            );
            // this.setState({ showMyNote: true });
          } else {
            this.setState({ showMyNote: true });
          }
        }
      });
    }
  };

  sendToDoctor = e => {
    this.setState({ showPrompt: false, isSendLoading: true }, () => {
      const { role, reportId } =
        this.props && this.props.location && this.props.location.state
          ? this.props.location.state
          : {};
      if (!payloadForFullReport.suggestedMedication) {
        delete payloadForFullReport.suggestedMedication;
      }
      if (
        !payloadForFullReport.suggestedBgl ||
        !payloadForFullReport.suggestedBgl.bglRanges ||
        payloadForFullReport.suggestedBgl.bglRanges === ''
      ) {
        delete payloadForFullReport.suggestedBgl;
      }
      if (noteAttached === false) {
        delete payloadForFullReport.reportNotes;
      }
      const patientId = this.props.match.params.id;
      if (this.state.note !== '') {
        if (payloadForNote) {
          if (payloadForNote.reportNotes) {
            payloadForNote.reportNotes.push({
              noteBody: this.state.note,
              noteType: 2,
              patientId,
              sentToId,
              title: 'REPORT_TITLE',
              messageTime: this.messageTime(),
            });
          }
        } else {
          payloadForNote = {
            reportNotes: [
              {
                noteBody: this.state.note,
                noteType: 2,
                patientId,
                sentToId,
                title: 'REPORT_TITLE',
                messageTime: this.messageTime(),
              },
            ],
          };
        }

        payloadForFullReport.reportNotes = payloadForNote.reportNotes;
        this.setState({
          displayNotes: payloadForFullReport.reportNotes,
        });
      }

      // this if condition is for snapshot reports
      // in case you're sending a new report with no changes in med or mon, then you go in this if condition
      // in case you're editing a pre existing report and you made no changes then you go in this if condition

      // report exists and there is NO NOTE then redirent
      // report exists and there IS NOTE then
      // is 'send report' button clicked? yes. redirect
      // is 'send report' button not clicked? no. patch call

      // report doesn't exist and there is NO NOTE then post. either way, post call
      // report doesn't exist and there IS NOTE then post call

      if (!this.state.isSuggestedMedicationUpdated && !this.state.isSuggestedMonitoringUpdated) {
        if (this.state.reportExists) {
          if (!('reportNotes' in payloadForFullReport))
            this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
          else if (this.state.sendNoteButtonClicked)
            this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
          else {
            // this.sendMessage(e);

            if (this.state.note) {
              noteAttached = true;
              this.props.form.validateFields(err => {
                if (err === null) {
                  const reportId =
                    this.props.location &&
                      this.props.location.state &&
                      this.props.location.state.reportId
                      ? this.props.location.state.reportId
                      : '';
                  if (reportId) {
                    const newNote = {
                      noteBody: this.state.note,
                      noteType: 2,
                      patientId,
                      reportId,
                      sentToId,
                      title: 'REPORT_TITLE',
                    };
                    let oldReportData;
                    AddNotes(
                      newNote,
                      res => {
                        oldReportData = cloneDeep(this.state.reportData);
                        oldReportData.reportNotes ? oldReportData.reportNotes.push(res) : '';
                        this.setState({
                          showMyNote: true,
                          reportData: oldReportData,
                          note: '',
                          isSendLoading: false,
                        });
                        this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
                      },
                      err => {
                        console.log('err', err);
                      },
                    );
                  }
                }
              });
            }
          }
        } else {
          CompleteReport(
            payloadForFullReport,
            res => {
              this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
              this.setState({
                reportData: res,
                isSendLoading: false,
              });
            },
            err => {
              console.log('err', err);
            },
          );
        }
        return;
      }

      // changes to med and mon handled here!
      if (
        (role !== 'ROLE_DIETICIAN' && this.state.value === 'DOCTOR') ||
        role === 'ROLE_DOCTOR' ||
        this.state.value === 'EDUCATOR' ||
        role === 'ROLE_EDUCATOR'
      ) {
        if (
          this.state.reportExists &&
          (this.state.isSuggestedMedicationUpdated || this.state.isSuggestedMonitoringUpdated)
        ) {
          payloadForFullReport.reportId = reportId;
          CompleteReportPatch(
            payloadForFullReport,
            res => {
              this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
              this.setState({
                reportData: res,
                isSendLoading: false,
              });
            },
            err => {
              console.log('err', err);
            },
          );
        } else {
          CompleteReport(
            payloadForFullReport,
            res => {
              this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
              this.setState({
                reportData: res,
              });
            },
            err => {
              console.log('err', err);
            },
          );
        }
      }
      e.preventDefault();
      this.setState({
        note1: this.state.note,
        note: '',
      });
    });
  };

  editMedication = (
    currentPatientName,
    id,
    currentData,
    role,
    educatorName,
    doctorName,
    doctorSentToId,
    educatorSentToId,
    dieticianSentToId,
    reportId,
    currentPatientDetails,
    suggestedBGL,
    reportName,
  ) => {
    this.props.history.push({
      pathname: `/medication-edit/${id}`,
      state: {
        loggedInUserId: this.state.loggedInUserId,
        currentPatientName,
        reportEdit: true,
        suggestedData:
          this.props.location.state && this.props.location.state.finalData
            ? this.props.location.state.finalData
            : this.state.reportData && this.state.reportData.suggestedMedication
              ? this.state.reportData.suggestedMedication
              : '',
        role,
        currentData,
        educatorName,
        doctorName,
        doctorSentToId,
        educatorSentToId,
        dieticianSentToId,
        reportId,
        from: 'report',
        currentPatientDetails,
        suggestedBGL,
        noteData: payloadForFullReport.reportNotes ? payloadForFullReport.reportNotes : [],
        reportName,
      },
    });
  };

  editMonitoring = (
    currentPatientName,
    id,
    currentData,
    role,
    educatorName,
    doctorName,
    doctorSentToId,
    educatorSentToId,
    dieticianSentToId,
    reportId,
    currentPatientDetails,
    finalData,
    reportName,
  ) => {
    this.props.history.push({
      pathname: `/bgl-edit/${id}/edit`,
      state: {
        loggedInUserId: this.state.loggedInUserId,
        currentPatientName,
        reportEdit: true,
        suggestedData:
          this.props.location.state && this.props.location.state.suggestedBGLRanges
            ? this.props.location.state.suggestedBGLRanges
            : this.state.reportData && this.state.reportData.suggestedBgl
              ? this.state.reportData.suggestedBgl
              : '',
        role,
        currentData,
        educatorName,
        doctorName,
        doctorSentToId,
        educatorSentToId,
        dieticianSentToId,
        reportId,
        comingFrom: 'report',
        currentPatientDetails,
        suggestedMedications:
          this.props.location.state && this.props.location.state.finalData
            ? this.props.location.state.finalData
            : this.state.reportData && this.state.reportData.suggestedMedication
              ? {
                medications: this.state.reportData.suggestedMedication.medications,
                patientId: this.state.reportData.patientId,
              }
              : '',
        noteData: payloadForFullReport.reportNotes ? payloadForFullReport.reportNotes : [],
        reportName,
      },
    });
  };

  viewMonitoring = (
    reportId,
    id,
    role,
    currentPatientName,
    currentPatientDetails,
    assignedToTypeId,
  ) => {
    this.props.history.push({
      pathname: `/bgl-plan/${id}`,
      state: {
        selectedReportHCP: this.state.value,
        reportId,
        role,
        currentPatientName,
        mode: 'view',
        comingFrom: 'report',
        currentPatientDetails,
        assignedToTypeId,
        noteData: payloadForFullReport.reportNotes ? payloadForFullReport.reportNotes : [],
      },
    });
  };

  viewMedication = (
    reportId,
    id,
    role,
    currentPatientName,
    currentPatientDetails,
    assignedToTypeId,
  ) => {
    this.props.history.push({
      pathname: `/medication/${id}`,
      state: {
        selectedReportHCP: this.state.value,
        reportId,
        role,
        currentPatientName,
        comingFrom: 'report',
        currentPatientDetails,
        assignedToTypeId,
        noteData: payloadForFullReport.reportNotes ? payloadForFullReport.reportNotes : [],
      },
    });
  };

  cancel = id => {
    if (
      get(this.props, 'location.state.comingFrom') === 'edit-medication'
    ) {
      this.toggleWarningMessageOnCancel();
    } else if (
      get(this.props, 'location.state.comingFrom') === 'edit-monitoring'
    ) {
      this.toggleWarningMessageOnCancel();
    } else {
      this.props.history.push({
        pathname: `/patient-dashboard/${id}`,
      });
    }
  };

  leave = id => {
    if (this.state.showWarningMessageOnCancel) {
      this.setState(
        {
          showPrompt: false,
        },
        () => {
          this.props.history.push({
            pathname: `/patient-dashboard/${id}`,
          });
        },
      );
    }
  };

  getStatusTextForCurrentPrevious = (responseData, t) => {
    const statusText = '';
    if (responseData) {
      let prefix = '';
      if (responseData.configBGlGroup) {
        return false;
      }
      if (this.props.location.state) {
        if (
          this.props.location.state.role === 'ROLE_EDUCATOR' ||
          this.props.location.state.role === 'ROLE_DIETICIAN' ||
          this.props.location.state.role === 'ROLE_DOCTOR'
        ) {
          if (responseData.createdByRole === 'ROLE_DOCTOR') {
            prefix = `${t('ADDED_BY')} `;
          } else if (
            responseData.createdByRole === 'ROLE_EDUCATOR' &&
            responseData.updatedByRole === 'ROLE_DOCTOR'
          ) {
            prefix = `${t('APPROVED_BY')} `;
          } else if (
            responseData.createdByRole === 'ROLE_PATIENT' &&
            responseData.updatedByRole === 'ROLE_EDUCATOR'
          ) {
            prefix = `${t('REQUESTED_BY')} `;
          } else if (
            responseData.createdByRole === 'ROLE_PATIENT' &&
            responseData.updatedByRole === 'ROLE_DOCTOR'
          ) {
            prefix = `${t('APPROVED_BY')} `;
          }
        }
      }
      if (prefix) {
        const name = responseData.updatedByName
          ? responseData.updatedByName
          : responseData.createdByName
            ? responseData.createdByName
            : '';
        const role = responseData.updatedByRole
          ? responseData.updatedByRole
          : responseData.createdByRole
            ? responseData.createdByRole
            : '';
        const timeStamp = responseData.updatedAt ? responseData.updatedAt : responseData.createdAt;
        return (
          <small className="text-muted font-12">
            {prefix} {t(getRole(role))}: <a className="text-primary">{name}</a>
            <span className="mx-1">|</span>
            <a className="text-primary">{formatDate(new Date(timeStamp))}</a>
          </small>
        );
      }
    }
    return statusText;
  };

  getStatusTextForMedication = (reportData, t) => {
    const statusText = '';
    let prefix = '';
    if (!isEmpty(reportData)) {
      if (this.props.location.state) {
        const stateRole = this.props.location.state.role
          ? this.props.location.state.role
          : store.getState().auth.userDetails.roles[0];
        if (stateRole === 'ROLE_EDUCATOR' || stateRole === 'ROLE_DIETICIAN') {
          if (reportData.createdByRole === 'ROLE_EDUCATOR') {
            if (
              reportData.suggestedMedication &&
              getStatus(reportData.suggestedMedication.medications[0].status) === 'PENDING'
            ) {
              prefix = t('REQUESTED_BY');
            } else if (
              reportData.suggestedMedication &&
              getStatus(reportData.suggestedMedication.medications[0].status) === 'ACTIVE' &&
              reportData.updatedByRole === 'ROLE_DOCTOR'
            ) {
              prefix = t('APPROVED_BY');
            }
          } else if (reportData.createdByRole === 'ROLE_DOCTOR') {
            prefix = t('ADDED_BY');
          }
        } else if (stateRole === 'ROLE_DOCTOR') {
          if (reportData.createdByRole === 'ROLE_EDUCATOR') {
            if (
              reportData.suggestedMedication &&
              getStatus(reportData.suggestedMedication.medications[0].status) === 'PENDING'
            ) {
              prefix = t('REQUESTED_BY');
            } else if (
              reportData.suggestedMedication &&
              getStatus(reportData.suggestedMedication.medications[0].status) === 'ACTIVE' &&
              reportData.updatedByRole === 'ROLE_DOCTOR'
            ) {
              prefix = t('APPROVED_BY');
            }
          } else if (reportData.createdByRole === 'ROLE_DOCTOR') {
            prefix = t('ADDED_BY');
          }
        }
      }
    }
    let temprole = '';
    let temptimestamp = '';
    if (!prefix && store.getState().auth.userDetails.roles[0] === 'ROLE_EDUCATOR') {
      prefix = t('REQUESTED_BY');
      temprole = store.getState().auth.userDetails.roles[0];
      temptimestamp = new Date().getTime();
    }

    const name = !isEmpty(reportData)
      ? reportData.status === 9 && reportData.updatedByName
        ? reportData.updatedByName
        : reportData.createdByName
          ? reportData.createdByName
          : ''
      : store.getState().auth.userDetails.name;
    const role =
      temprole ||
      (!isEmpty(reportData)
        ? reportData.status === 9 && reportData.updatedByRole
          ? reportData.updatedByRole
          : reportData.createdByRole
            ? reportData.createdByRole
            : ''
        : store.getState().auth.userDetails.roles[0]);
    const timeStamp =
      temptimestamp ||
      (!isEmpty(reportData)
        ? reportData.updatedAt
          ? reportData.updatedAt
          : reportData.createdAt
            ? reportData.createdAt
            : ''
        : new Date().getTime());
    if (prefix) {
      return (
        <small className="text-muted font-12">
          {prefix} {t(getRole(role))}: <a className="text-primary">{name}</a>
          <span className="mx-1">|</span>
          <a className="text-primary">{formatDate(new Date(timeStamp))}</a>
        </small>
      );
    }

    return statusText;
  };

  getStatusTextForMonitoring = (reportData, t) => {
    const statusText = '';
    let prefix = '';
    if (!isEmpty(reportData)) {
      if (this.props.location.state) {
        const stateRole = this.props.location.state.role
          ? this.props.location.state.role
          : store.getState().auth.userDetails.roles[0];
        if (stateRole === 'ROLE_EDUCATOR' || stateRole === 'ROLE_DIETICIAN') {
          if (reportData.createdByRole === 'ROLE_EDUCATOR') {
            if (
              reportData.suggestedBgl &&
              getStatus(reportData.suggestedBgl.status) === 'PENDING'
            ) {
              prefix = t('REQUESTED_BY');
            } else if (
              reportData.suggestedBgl &&
              getStatus(reportData.suggestedBgl.status) === 'ACTIVE' &&
              reportData.updatedByRole === 'ROLE_DOCTOR'
            ) {
              prefix = t('APPROVED_BY');
            }
          } else if (reportData.createdByRole === 'ROLE_DOCTOR') {
            prefix = t('ADDED_BY');
          }
        } else if (stateRole === 'ROLE_DOCTOR') {
          if (reportData.createdByRole === 'ROLE_EDUCATOR') {
            if (
              reportData.suggestedBgl &&
              getStatus(reportData.suggestedBgl.status) === 'PENDING'
            ) {
              prefix = t('REQUESTED_BY');
            } else if (
              reportData.suggestedBgl &&
              getStatus(reportData.suggestedBgl.status) === 'ACTIVE' &&
              reportData.updatedByRole === 'ROLE_DOCTOR'
            ) {
              prefix = t('APPROVED_BY');
            }
          } else if (reportData.createdByRole === 'ROLE_DOCTOR') {
            prefix = t('ADDED_BY');
          }
        }
      }
    }
    let temprole = '';
    let temptimestamp = '';
    if (!prefix && store.getState().auth.userDetails.roles[0] === 'ROLE_EDUCATOR') {
      prefix = t('REQUESTED_BY');
      temprole = store.getState().auth.userDetails.roles[0];
      temptimestamp = new Date().getTime();
    }

    const name = !isEmpty(reportData)
      ? reportData.status === 9 && reportData.updatedByName
        ? reportData.updatedByName
        : reportData.createdByName
          ? reportData.createdByName
          : ''
      : store.getState().auth.userDetails.name;
    const role =
      temprole ||
      (!isEmpty(reportData)
        ? reportData.status === 9 && reportData.updatedByRole
          ? reportData.updatedByRole
          : reportData.createdByRole
            ? reportData.createdByRole
            : ''
        : store.getState().auth.userDetails.roles[0]);
    const timeStamp =
      temptimestamp ||
      (!isEmpty(reportData)
        ? reportData.updatedAt
          ? reportData.updatedAt
          : reportData.createdAt
            ? reportData.createdAt
            : ''
        : new Date().getTime());
    if (prefix) {
      return (
        <small className="text-muted font-12">
          {prefix} {t(getRole(role))}: <a className="text-primary">{name}</a>
          <span className="mx-1">|</span>
          <a className="text-primary">{formatDate(new Date(timeStamp))}</a>
        </small>
      );
    }

    return statusText;
  };

  updateReportStatus = (reportId, status, patientId) => env => {
    this.setState(
      { doctorApprovedOrRejected: true, showPrompt: false, isSendLoading: true },
      () => {
        const role = this.props.location.state.role;
        const comingFrom =
          this.props.location && this.props.location.state && this.props.location.state.comingFrom;

        if (this.state.note !== '') {
          if (payloadForNote) {
            if (payloadForNote.reportNotes) {
              payloadForNote.reportNotes.push({
                noteBody: this.state.note,
                noteType: 2,
                patientId,
                sentToId,
                title: 'REPORT_TITLE',
                messageTime: this.messageTime(),
              });
            }
          } else {
            payloadForNote = {
              reportNotes: [
                {
                  noteBody: this.state.note,
                  noteType: 2,
                  patientId,
                  sentToId,
                  title: 'REPORT_TITLE',
                  messageTime: this.messageTime(),
                },
              ],
            };
          }

          payloadForFullReport.reportNotes = payloadForNote.reportNotes;
          this.setState({
            displayNotes: payloadForFullReport.reportNotes,
          });
        }

        if (role === 'ROLE_DOCTOR') {
          if (
            status !== 10 &&
            ((this.state.isSuggestedMedicationUpdated &&
              get(this.props, 'location.state.finalData.medications') ) ||
              (this.props.location.state && this.props.location.state.formData))
          ) {
            payloadForFullReport.reportId = reportId;
            CompleteReportPatch(
              payloadForFullReport,
              res => {
                this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
                this.setState({
                  reportData: res,
                });
              },
              err => {
                console.log('err', err);
              },
            );
          } else if (this.state.note) {
            noteAttached = true;
            this.props.form.validateFields(err => {
              if (err === null) {
                const reportId =
                  this.props.location &&
                    this.props.location.state &&
                    this.props.location.state.reportId
                    ? this.props.location.state.reportId
                    : '';
                if (reportId) {
                  const newNote = {
                    noteBody: this.state.note,
                    noteType: 2,
                    patientId,
                    reportId,
                    sentToId,
                    title: 'REPORT_TITLE',
                  };
                  let oldReportData;
                  AddNotes(
                    newNote,
                    res => {
                      oldReportData = cloneDeep(this.state.reportData);
                      oldReportData.reportNotes ? oldReportData.reportNotes.push(res) : '';
                      this.setState({ showMyNote: true, reportData: oldReportData, note: '' });
                      this.props.history.push(`/patient-dashboard/${this.props.match.params.id}`);
                    },
                    err => {
                      console.log('err', err);
                    },
                  );
                }
              }
            });
          }
        }

        if (
          comingFrom &&
          comingFrom === 'edit-medication' &&
          !this.state.isSuggestedMedicationUpdated
        ) {
          ChangeReportStatus(
            {
              reportId,
              statusId: 13,
            },
            res => {
              ChangeReportStatus(
                {
                  reportId,
                  statusId: status,
                },
                res => {
                  this.props.history.push(`/patient-dashboard/${patientId}`);
                },
                err => {
                  console.log('err', err);
                },
              );
            },
            err => {
              console.log('err', err);
            },
          );
        } else {
          ChangeReportStatus(
            {
              reportId,
              statusId: status,
            },
            res => {
              this.props.history.push(`/patient-dashboard/${patientId}`);
              this.setState({
                reportData: res,
              });
            },
            err => {
              console.log('err', err);
            },
          );
        }
        this.setState({
          note1: this.state.note,
          note: '',
        });
      },
    );
  };

  showWarningConfirmation = status => env => {
    if (status === 10) {
      this.setState({
        showWarningMessage: true,
      });
    }
  };

  toggleApprovePopup = () => {
    this.setState({
      showApprovePopup: !this.state.showApprovePopup,
    });
  };

  toggleCreatePopup = () => {
    this.setState({
      showCreatePopup: !this.state.showCreatePopup,
    });
  };

  markReportAsRead = event => {
    const patientId = this.props.match.params.id;
    const reportId =
      this.props.location && this.props.location.state && this.props.location.state.reportId
        ? this.props.location.state.reportId
        : '';
    if (!this.state.sendNoteButtonClicked && noteAttached) this.sendMessage(event);
    ChangeReportStatus(
      {
        reportId,
        statusId: 11,
      },
      res => {
        this.props.history.push(`/patient-dashboard/${patientId}`);
        this.setState({
          reportData: res,
        });
      },
      err => {
        console.log('err', err);
      },
    );
  };

  getReportName = currentPatientDetails => {
    return `${currentPatientDetails.fullName} - ${this.state.timeOfReportUpdate}`;
  };

  getReportTitle = (currentPatientDetails, role, t) => {
    let title = t('CREATE_A_REPORT');
    let reportName = this.getReportName(currentPatientDetails);
    if (!this.state.reportExists)
      return title;
    else if (this.state.reportExists && (this.state.isSuggestedMedicationUpdated || this.state.isSuggestedMonitoringUpdated)) // reports exists and the report is JUST viewing it
      return `${t('EDIT')} ${reportName}`;
    else if (this.state.reportExists)
      return `${reportName}`;
  };

  selectReportButton = (t, config) => {
    const role = this.props.location.state ? this.props.location.state.role : '';
    // debugger;
    // you're recieving a snapshot report that has not been read yet
    if (
      this.state.snapshotReport &&
      this.state.createdByRole != role &&
      this.state.reportData.status !== 11
    ) {
      return (
        <button
          onClick={this.markReportAsRead}
          className="btn btn-primary px-3 my-1 font-14"
          type="primary"
        >
          <span>{t('MARK_REPORT_AS_READ')}</span>
        </button>
      );
    } // report HAS to exist, it cant be a snapshot report. it can be edited and if it CANT, see if its LOCKED BY YOU
    else if (
      role === 'ROLE_DOCTOR' &&
      (this.state.reportExists &&
        !this.state.snapshotReport &&
        (this.state.canEditReport ||
          (this.state.reportLocked &&
            this.state.reportData.lockedById &&
            this.state.reportData.lockedById === this.state.loggedInUserId)))
    ) {
      return (
        <Fragment>
          <button
            onClick={() => this.toggleApprovePopup()}
            style={{ width: '110px' }}
            className={`btn btn-primary px-3 font-14 ${config.btnMargin} my-1 `}
            type="primary"
          >
            <Icon type="check-circle-o" />
            <span className="mx-2">{t('APPROVE')}</span>
          </button>
          <button
            onClick={this.showWarningConfirmation(10)}
            style={{ width: '110px' }}
            className={`btn btn-outline-secondary font-14 text-dark px-3 my-1 `}
            type="primary"
          >
            <Icon type="close-circle-o" />
            <span className="mx-2">{t('REJECT')}</span>
          </button>
        </Fragment>
      );
    } else if (
      role === 'ROLE_EDUCATOR' &&
      this.state.reportExists &&
      (this.state.isSuggestedMedicationUpdated || this.state.isSuggestedMonitoringUpdated)
    ) {
      return (
        <button onClick={this.toggle} className="btn btn-primary px-3 my-1 font-14" type="primary">
          <Icon type="check-circle-o" />
          <span className="mx-2">{t('SEND_UPDATED_REPORT')}</span>
        </button>
      );
    } // you're creating a report, you're editing a report - but you cant edit a snapshot report even if its status is one of those that can be 'edited', you're editing a report that YOU locked
    else if (
      !this.state.reportExists ||
      (this.state.reportExists && !this.state.snapshotReport && this.state.canEditReport) ||
      (this.state.reportLocked &&
        this.state.reportData.lockedById &&
        this.state.reportData.lockedById === this.state.loggedInUserId)
    ) {
      return (
        <button onClick={this.toggle} className="btn btn-primary px-3 my-1 font-14" type="primary">
          <Icon type="check-circle-o" />
          <span className="mx-2">{t('SEND_REPORT')}</span>
        </button>
      );
    }
    return null;
  };
  render() {
    const { params } = this.props.match;
    const lang = localStorage.getItem('i18nextLng');
    const config = {
      textMargin: 'ml-3',
      btnDirection: 'float-right',
      btnDirectionType2: 'text-right',
      headingMargin: 'ml-0',
      btnMargin: 'mr-md-2',
      textDirection: 'text-left',
      buttonPadding: 'pl-0',
      iconPadding: 'pr-2',
    };

    if (isArabicLanguageCode(lang)) {
      config.textMargin = 'mr-3';
      config.btnDirection = 'float-left';
      config.btnMargin = 'ml-md-2';
      config.btnDirectionType2 = 'text-left';
      config.headingMargin = 'mr-0';
      config.textDirection = 'text-right';
      config.buttonPadding = 'pr-0';
      config.iconPadding = 'pl-2';
    }
    let currentPatientDetails;
    if (
      get(this.props, 'location.state.currentPatientDetails')
    ) {
      if (
        get(this.props, 'location.state.currentPatientDetails.state.currentPatientDetails')) {
        currentPatientDetails = this.props.location.state.currentPatientDetails.state.currentPatientDetails;
      } else {
        currentPatientDetails = this.props.location.state.currentPatientDetails;
      }
    } else {
      currentPatientDetails = {
        ageMonths: '',
        ageYears: '',
        bloodPressureHigh: '',
        bloodPressureLow: '',
        coronaryArteryDisease: '',
        coronaryKidneyDisease: '',
        diabetesDiagnoseDate: '',
        diabetesTimeStamp: '',
        dob: '',
        dobTimeStamp: '',
        durationOfDiabetesMonths: '',
        durationOfDiabetesYears: '',
        email: '',
        fullName: '',
        gender: '',
        hasComplication: '',
        hba1c: '',
        height: '',
        heightUnit: '',
        hospitalId: '',
        hypertension: '',
        ldl: '',
        others: '',
        planStartDate: '',
        profilePicture: '',
        retinopathy: '',
        typeOfDiabetes: '',
        updateTimestamp: '',
        userId: '',
        weight: '',
        weightUnit: '',
      };
    }
    let currentPatientName;
    if (
      this.props.location &&
      this.props.location.state &&
      this.props.location.state.currentPatientName
    ) {
      currentPatientName =
        this.props.location.state && this.props.location.state.currentPatientName
          ? this.props.location.state.currentPatientName
          : '';
    } else {
      currentPatientName =
        this.props.location.state && this.props.location.state.currentPatientDetails
          ? this.props.location.state.currentPatientDetails.fullName
          : '';
    }
    const role = this.props.location.state ? this.props.location.state.role : '';
    const reportId = this.props.location.state ? this.props.location.state.reportId : '';
    // const loggedInUserId = this.props.location.state ? this.props.location.state.loggedInUserId : ''; THIS HAS BEEN TRANSFERRED TO STATE
    // const reportData = this.props.location.state ? this.props.location.state.report : {};
    const { reportData, from } = this.state;

    if (role === 'ROLE_DOCTOR' || role === 'ROLE_DIETICIAN') {
      sendToName = this.props.location.state.educatorName;
      assignedToTypeId = 2;
    } else if (role === 'ROLE_EDUCATOR') {
      if (!this.state.isSenderChange) {
        if (this.state && this.state.createdByRole && this.state.createdByRole === 'ROLE_DIETICIAN')
          assignedToTypeId = 2;
        else assignedToTypeId = 1;
      }
      sendToName =
        this.state.value === 'DOCTOR'
          ? this.props.location.state.doctorName
          : this.state.value === 'DIETITIAN'
            ? this.props.location.state.dieticianName
            : '';
    }
    // This condition is to handle case for back redirection state setting for dietician and doctor checkbox
    if (
      this.props.location &&
      this.props.location.state &&
      this.props.location.state.assignedToTypeId
    ) {
      assignedToTypeId = this.props.location.state.assignedToTypeId;
      sendToName = assignedToTypeId === 3 ? this.props.location.state.dieticianName : sendToName;
    }

    const { activeTab, activeTab1 } = this.state;
    // this.setState({currentData:currentData,previousData:previousData});
    const patientId = this.props.match.params.id;
    let suggestedMedication;
    suggestedMedication =
      this.props.location.state && this.props.location.state.finalData
        ? this.props.location.state.finalData
        : suggestedMedication
          ? suggestedMedication
          : reportData.suggestedMedication
            ? reportData.suggestedMedication
            : null;
    console.log('SUGGSTED MEDICATIONS')
    console.log(suggestedMedication);
    let currentData;
    if (this.state.reportExists) {
      if (!this.state.snapshotReport) currentData = this.state.responseData[0];
      else {
        currentData =
          suggestedMedication && suggestedMedication.medications
            ? suggestedMedication.medications
            : [];
        suggestedMedication = {};
      }
    } else if (role === 'ROLE_DOCTOR') {
      currentData =
        suggestedMedication && suggestedMedication.medications
          ? suggestedMedication.medications
          : this.state.responseData
            ? this.state.responseData[0]
            : [];
    } else {
      currentData = this.state.responseData[0];
    }
    const previousData = !this.state.snapshotReport ? this.state.responseData[1] : '';
    const payloadForMedication = {
      suggestedMedication,
    };
    payloadForFullReport = {
      patientId,
      assignedToTypeId,
      reportNotes: payloadForNote ? payloadForNote.reportNotes : [],
      suggestedMedication: payloadForMedication.suggestedMedication,
    };
    let content;
    let contentPrevious;
    let contentSuggested;
    if (
      currentData &&
      currentData.length &&
      currentData[0].medicineId &&
      currentData[0].medicineId !== null
    ) {
      content = currentData.map(medicine => <MedicationData medicine={medicine} />);
    } else {
      content = (
        <I18n ns="translations">
          {t => (
            <div className="col-12">
              <p className="text-muted my-3 mb-0">{t('NO_CURRENT_MEDICATIONS')}.</p>
            </div>
          )}
        </I18n>
      );
    }
    if (
      previousData &&
      previousData.length &&
      previousData[0].medicineId &&
      previousData[0].medicineId !== null
    ) {
      contentPrevious = previousData.map(medicine => <MedicationData medicine={medicine} />);
    } else if (this.state.snapshotReport) {
      contentPrevious = <div />;
    } else {
      contentPrevious = (
        <I18n ns="translations">
          {t => (
            <div className="col-12">
              <p className="text-muted my-3 mb-0">{t('NO_PREVIOUS_MEDICATIONS')}.</p>
            </div>
          )}
        </I18n>
      );
    }
    if (
      get(suggestedMedication, 'medications[0].medicineId') !== null
    ) {
      contentSuggested = suggestedMedication.medications.map(medicine => (
        <MedicationData medicine={medicine} />
      ));
    } else {
      contentSuggested = (
        // <div>hahah</div>
        <I18n ns="translations">
          {t => (
            <div className="col-12">
              <p className="text-muted my-3 mb-0">{t('NO_SUGGESTED_MEDICATIONS')}.</p>
            </div>
          )}
        </I18n>
      );
    }
    /* BGL Monitoring */
    let currentMonitoring;
    console.log(currentMonitoring);
    console.log(previousMonitoring);
    let suggestedBGLRanges =
      this.props.location.state && this.props.location.state.suggestedBGLRanges
        ? this.props.location.state.suggestedBGLRanges
        : reportData.suggestedBgl
          ? reportData.suggestedBgl
          : this.props.location.state
            ? this.props.location.state.suggestedBGLRanges
            : null;
    if (role !== 'ROLE_DOCTOR') {
      currentMonitoring =
        this.state.patientRanges &&
        this.state.patientRanges.length > 0 &&
        this.state.patientRanges[0];
    } else {
      currentMonitoring =
        this.props.location.state && this.props.location.state.suggestedBGLRanges
          ? this.props.location.state.suggestedBGLRanges
          : this.state.patientRanges[0];
    }
    if (this.state.reportExists) {
      if (!this.state.snapshotReport) currentMonitoring = this.state.patientRanges[0];
      else {
        currentMonitoring =
          suggestedBGLRanges && suggestedBGLRanges.bglRanges ? suggestedBGLRanges : '';
        suggestedBGLRanges = {};
      }
    }

    let previousMonitoring = !this.state.snapshotReport ? this.state.patientRanges[1] : '';
    let contentMonitoring = null;
    let contentPreviousMonitoring = null;
    let contentSuggestedMonitoring = null;
    payloadForFullReport.suggestedBgl = suggestedBGLRanges;

    if (currentMonitoring) {
      contentMonitoring = currentMonitoring.bglRanges.map(bglRange => {
        if (bglRange.minimum === -1 && bglRange.maximum === -1) {
          return null;
        }
        return <BGLMonitrotingData medicine={bglRange} />;
      });
      if (
        !contentMonitoring ||
        (contentMonitoring && contentMonitoring.length === 1 && contentMonitoring[0] === null)
      ) {
        contentMonitoring = (
          <I18n ns="translations">
            {t => (
              <div className="col-12">
                <p className="text-muted my-3 mb-0">{t('No Current Monitoring')}.</p>
              </div>
            )}
          </I18n>
        );
      }
    } else if (!currentMonitoring || currentMonitoring.bglRanges.length === 0) {
      contentMonitoring = (
        <I18n ns="translations">
          {t => (
            <div className="col-12">
              <p className="text-muted my-3 mb-0">{t('No Current Monitoring')}.</p>
            </div>
          )}
        </I18n>
      );
    }

    if (previousMonitoring) {
      contentPreviousMonitoring = previousMonitoring.bglRanges.map(bglRange => {
        if (bglRange.minimum === -1 && bglRange.maximum === -1) {
          return null;
        }
        return <BGLMonitrotingData medicine={bglRange} />;
      });
      if (
        !contentPreviousMonitoring ||
        (contentPreviousMonitoring &&
          contentPreviousMonitoring.length === 1 &&
          contentPreviousMonitoring[0] === null)
      ) {
        contentPreviousMonitoring = (
          <I18n ns="translations">
            {t => (
              <div className="col-12">
                <p className="text-muted my-3 mb-0">{t('No Previous Monitoring')}</p>
              </div>
            )}
          </I18n>
        );
      }
    } else if (previousMonitoring === null || previousMonitoring === undefined) {
      contentPreviousMonitoring = (
        <I18n ns="translations">
          {t => (
            <div className="col-12">
              <p className="text-muted my-3 mb-0">{t('No Previous Monitoring')}</p>
            </div>
          )}
        </I18n>
      );
    }
    if (suggestedBGLRanges && suggestedBGLRanges.bglRanges) {
      contentSuggestedMonitoring = suggestedBGLRanges.bglRanges.map(
        range =>
          range.frequency && range.maximum !== -1 && range.minimum !== -1 ? (
            <BGLMonitrotingData medicine={range} />
          ) : null,
      );
      if (
        !contentSuggestedMonitoring ||
        (contentSuggestedMonitoring &&
          contentSuggestedMonitoring.length === 1 &&
          contentSuggestedMonitoring[0] === null)
      ) {
        contentSuggestedMonitoring = <div />;
      }
    } else if (
      !suggestedBGLRanges ||
      (suggestedBGLRanges.bglRanges && suggestedBGLRanges.bglRanges.length === 0)
    ) {
      contentSuggestedMonitoring = <div />;
    }

    /*
     EDIT
     Existing reports:
     FIRST CHECK IF THE STATUS IS 'NEW', 'PENDING', 'REJECTED' or if its not a SNAPSHOT. This condition preempts every other
     Doctor: ALWAYS show the edit button if you're a doctor
     Educator: Show edit button in two cases:
     1. Report was created by Doctor.
     2. Report was created by Educator for doctor.
     Dietitian: NEVER show edit button
     Creating new reports:
     Doctor: ALWAYS show the edit button if you're a doctor
     Educator: Show edit button in one case:
     1. Report is being created for doctor
     */
    /*
     VIEW
     Existing reports:
     Doctor: NEVER show view button
     Educator: Show view button in cases
     1. Report was created by dietitian
     2. Report was created by educator for dietitian
     Dietitian: ALWAYS show view button
     Creating new reports:
     Doctor: ALWAYS show the edit button if you're a doctor
     Educator: Show edit button in one case:
     1. Report is being created for doctor
     */
    console.log('STATE');
    console.log(this.state);
    if (
      !this.state.snapshotReport &&
      (this.state.canEditReport ||
        (this.state.reportLocked &&
          this.state.reportData.lockedById &&
          this.state.reportData.lockedById == this.state.loggedInUserId)) &&
      (role === 'ROLE_DOCTOR' ||
        (role === 'ROLE_EDUCATOR' &&
          ((this.state.reportExists &&
            (this.state.createdByRole === 'ROLE_DOCTOR' ||
              (this.state.createdByRole === 'ROLE_EDUCATOR' &&
                this.state.assignedToTypeId === 1))) ||
            (!this.state.reportExists && this.state.value === 'DOCTOR'))))
    ) {
      // var self = this;
      const lang = localStorage.getItem('i18nextLng');
      const config = {
        textMargin: 'ml-3',
      };
      if (isArabicLanguageCode(lang)) {
        config.textMargin = 'mr-3';
      }
      medButton = (
        <I18n ns="translations">
          {t => (
            <button
              className="btn btn-white border float-right px-4 font-14"
              onClick={() => {
                this.setState({ editButtonClicked: true }, () => {
                  if (
                    this.props &&
                    this.props.location &&
                    this.props.location.state &&
                    /*this.props.location.state.role !== 'ROLE_DOCTOR' &&*/ this.props.location
                      .state.reportId
                  ) {
                    ChangeReportStatus(
                      {
                        reportId,
                        statusId: 3,
                      },
                      res => {
                        this.editMedication(
                          this.props.location.state &&
                            this.props.location.state.currentPatientDetails
                            ? this.props.location.state.currentPatientDetails.fullName
                            : '',
                          this.props.match.params.id,
                          this.state.responseData[0],
                          this.props.location.state.role,
                          this.props.location.state.educatorName,
                          this.props.location.state.doctorName,
                          this.props.location.state.doctorSentToId,
                          this.props.location.state.educatorSentToId,
                          this.props.dieticianSentToId,
                          this.props.location.state.reportId,
                          this.props.location.state.currentPatientDetails,
                          this.props.location &&
                          this.props.location.state &&
                          this.props.location.state.suggestedBGLRanges &&
                          this.props.location.state.suggestedBGLRanges,
                          this.getReportName(currentPatientDetails),
                        );
                      },
                      err => {
                        console.log('err', err);
                      },
                    );
                  } else {
                    this.editMedication(
                      this.props.location.state && this.props.location.state.currentPatientDetails
                        ? this.props.location.state.currentPatientDetails.fullName
                        : '',
                      this.props.match.params.id,
                      this.state.responseData[0],
                      this.props.location.state.role,
                      this.props.location.state.educatorName,
                      this.props.location.state.doctorName,
                      this.props.location.state.doctorSentToId,
                      this.props.location.state.educatorSentToId,
                      this.props.dieticianSentToId,
                      this.props.location.state.reportId,
                      this.props.location.state.currentPatientDetails,
                      this.props.location &&
                      this.props.location.state &&
                      this.props.location.state.suggestedBGLRanges &&
                      this.props.location.state.suggestedBGLRanges,
                      this.getReportName(currentPatientDetails),
                    );
                  }
                });
              }}
            >
              <Icon type="edit" />
              <span className={`${config.textMargin}`}>{t('EDIT')}</span>
            </button>
          )}
        </I18n>
      );
      bglEdit = (
        <I18n ns="translations">
          {t => (
            <button
              className="btn btn-white border px-4 font-14"
              onClick={() => {
                this.setState({ editButtonClicked: true }, () => {
                  if (
                    this.props &&
                    this.props.location &&
                    this.props.location.state &&
                    /*this.props.location.state.role !== 'ROLE_DOCTOR' &&*/ this.props.location
                      .state.reportId
                  ) {
                    ChangeReportStatus(
                      {
                        reportId,
                        statusId: 3,
                      },
                      res => {
                        this.editMonitoring(
                          currentPatientName,
                          this.props.match.params.id,
                          currentData,
                          // this.props.location,
                          this.props.location.state.role,
                          this.props.location.state.educatorName,
                          this.props.location.state.doctorName,
                          this.props.location.state.doctorSentToId,
                          this.props.location.state.educatorSentToId,
                          this.props.dieticianSentToId,
                          this.props.location.state.reportId,
                          this.props.location.state.currentPatientDetails,
                          this.props.location &&
                          this.props.location.state &&
                          this.props.location.state.finalData &&
                          this.props.location.state.finalData,
                          this.getReportName(currentPatientDetails),
                        );
                      },
                      err => {
                        console.log('err', err);
                      },
                    );
                  } else {
                    this.editMonitoring(
                      currentPatientName,
                      this.props.match.params.id,
                      currentData,
                      // this.props.location,
                      this.props.location.state.role,
                      this.props.location.state.educatorName,
                      this.props.location.state.doctorName,
                      this.props.location.state.doctorSentToId,
                      this.props.location.state.educatorSentToId,
                      this.props.dieticianSentToId,
                      this.props.location.state.reportId,
                      this.props.location.state.currentPatientDetails,
                      this.props.location &&
                      this.props.location.state &&
                      this.props.location.state.finalData &&
                      this.props.location.state.finalData,
                      this.getReportName(currentPatientDetails),
                    );
                  }
                });
              }}
            >
              <Icon type="edit" />
              <span className={`${config.textMargin}`}>{t('EDIT')}</span>
            </button>
          )}
        </I18n>
      );
    } else if (
      this.state.snapshotReport ||
      !this.state.canEditReport ||
      (this.state.reportLocked &&
        this.state.reportData.lockedById &&
        this.state.reportData.lockedById !== this.state.loggedInUserIdthis.state.reportLocked &&
        this.state.reportData.lockedById &&
        this.state.reportData.lockedById !== this.state.loggedInUserId) ||
      (role === 'ROLE_DIETICIAN' ||
        (role === 'ROLE_EDUCATOR' &&
          ((this.state.reportExists &&
            (this.state.createdByRole === 'ROLE_DIETICIAN' ||
              (this.state.createdByRole === 'ROLE_EDUCATOR' &&
                this.state.assignedToTypeId === 3))) ||
            (!this.state.reportExists && this.state.value === 'DIETITIAN'))))
    ) {
      medButton = (
        <I18n ns="translations">
          {t => (
            <button
              className="btn btn-white border px-4"
              onClick={() => {
                this.viewMedication(
                  this.props &&
                    this.props.location &&
                    this.props.location.state &&
                    this.props.location.state.reportId
                    ? this.props.location.state.reportId
                    : '',
                  this.props.match.params.id,
                  role,
                  this.props.location.state && this.props.location.state.currentPatientDetails
                    ? this.props.location.state.currentPatientDetails.fullName
                    : '',
                  this.props.location.state && this.props.location.state.currentPatientDetails
                    ? this.props.location.state.currentPatientDetails
                    : '',
                  this.state && this.state.assignedToTypeId ? this.state.assignedToTypeId : '',
                );
              }}
            >
              <Icon type="eye-o" />
              <span className={`${config.textMargin}`}>{t('VIEW')}</span>
            </button>
          )}
        </I18n>
      );
      bglEdit = (
        <I18n ns="translations">
          {t => (
            <button
              className="btn btn-white border px-4"
              onClick={() => {
                this.viewMonitoring(
                  this.props &&
                    this.props.location &&
                    this.props.location.state &&
                    this.props.location.state.reportId
                    ? this.props.location.state.reportId
                    : '',
                  this.props.match.params.id,
                  role,
                  this.props.location.state && this.props.location.state.currentPatientDetails
                    ? this.props.location.state.currentPatientDetails.fullName
                    : '',
                  this.props.location.state.currentPatientDetails,
                  this.state && this.state.assignedToTypeId ? this.state.assignedToTypeId : '',
                );
              }}
            >
              <Icon type="eye-o" />
              <span className={`${config.textMargin}`}>{t('VIEW')}</span>
            </button>
          )}
        </I18n>
      );
    }
    let MyNoteDiv;
    let NoteInCard;
    let assignedToRole = null;

    if (!this.state.reportExists) {
      if (role === 'ROLE_EDUCATOR') {
        assignedToRole =
          this.state.value === 'DOCTOR' ? getRole('ROLE_DOCTOR') : getRole('ROLE_DIETICIAN');
      } else {
        assignedToRole = getRole('ROLE_EDUCATOR');
      }
    } else assignedToRole = getRole(this.state.assignedToRole);

    if (!this.state.reportExists && this.state.showMyNote) {
      MyNoteDiv = (
        <I18n ns="translations">
          {t => (
            <Fragment>
              {this.state.displayNotes.map(note => {
                return (
                  <div className="row py-2">
                    <div className="col-4 col-md-3">
                      <span>{t('ME')}:</span>
                    </div>
                    <div className="col-8 col-md-9">
                      {note.noteBody}
                      <div>
                        <small className="text-muted font-13">
                          <span className="">{note.messageTime}</span>
                        </small>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          )}
        </I18n>
      );
      NoteInCard = (
        <I18n ns="translations">
          {t => (
            <div>
              {t('NOTE:')}
              {this.state.displayNotes.map(note => {
                return note.noteBody;
              })}
            </div>
          )}
        </I18n>
      );
    } else {
      MyNoteDiv = <div />;
      NoteInCard = <div />;
    }


    const currentStatus = (t) => {
      if (suggestedMedication && suggestedMedication.medications && suggestedMedication.medications.length && suggestedMedication.medications[0].medicineId !== null && activeTab === 1) {
        return this.getStatusTextForMedication(reportData, t);
      }
      else if (activeTab === 2 && currentData && currentData.length && currentData[0].medicineId !== null) {
        return this.getStatusTextForCurrentPrevious(currentData[0], t);
      } else if (activeTab === 3 && previousData && previousData.length && previousData[0].medicineId !== null) {
        return this.getStatusTextForCurrentPrevious(previousData[0], t);
      } else if (currentData &&
        currentData.length &&
        currentData[0].medicineId !== null &&
        this.state.snapshotReport) {
        return this.getStatusTextForMedication(currentData[0], t);
      }
      return '';
    }
    const educatorName = get(this.props, 'location.state.educatorName', '');
    return (
      <I18n ns="translations">
        {t => (
          <div>
            {role === 'ROLE_DOCTOR' ? (
              <Prompt
                when={this.state.showPrompt && !this.state.editButtonClicked}
                message={t('CHANGES_WILL_NOT_BE_SAVED_REPORT_EDUCATOR', { name: sendToName })}
              />
            ) : (
                <Prompt
                  when={this.state.showPrompt && !this.state.editButtonClicked}
                  message={t('CHANGES_WILL_NOT_BE_SAVED_REPORT_DOCTOR', { name: sendToName })}
                />
              )}
            <div className="bg-light">
              <div className="px-lg-4">
                <nav aria-label="breadcrumb" className="pt-3">
                  <ol className="breadcrumb bg-transparent">
                    <li className="breadcrumb-item">
                      <Link to="/">{t('DASHBOARD')}</Link>
                    </li>
                    <li className="breadcrumb-item">
                      <Link to="/patients">{t('MY_PATIENTS')}</Link>
                    </li>
                    <li className="breadcrumb-item">
                      <Link to={`/patient-dashboard/${this.props.match.params.id}`}>
                        {currentPatientName}
                      </Link>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                      {this.getReportTitle(currentPatientDetails, role, t)}
                    </li>
                  </ol>
                </nav>
                <div className="profile-header container-fluid">
                  <div className="row align-items-center">
                    <div className="col">
                      <div className="row align-items-end justify-content-between">
                        <div className="col">
                          <h1 className="h4 text-primary m-0 f-600">
                            {this.getReportTitle(currentPatientDetails, role, t)}
                          </h1>
                          {this.state.reportLocked &&
                            this.state.reportData.lockedById &&
                            this.state.reportData.lockedById !== this.state.loggedInUserId ? (
                              <Fragment>
                                {' '}
                                <small className="text-danger">
                                  {t('REPORT_LOCKED_MSG', {
                                    name: this.state.reportData.lockedByName,
                                  })}
                                </small>{' '}
                                <i
                                  style={{ color: 'red' }}
                                  className="fa fa-exclamation-circle"
                                  aria-hidden="true"
                                />{' '}
                              </Fragment>
                            ) : (
                              undefined
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <hr />
              <div className="px-lg-4">
                <div className="profile-header container-fluid dr-container patient-dashboard-header">
                  <div className="row align-items-lg-center">
                    <div className="col-auto">
                      {getProfilePicture(
                        currentPatientDetails.fullName ? currentPatientDetails.fullName : '',
                        currentPatientDetails.profilePicture
                          ? currentPatientDetails.profilePicture
                          : '',
                      )}
                    </div>
                    <div className={`col ${config.buttonPadding}`}>
                      <div className="row align-items-end justify-content-between">
                        <div className={`col-12 col-lg ${config.textDirection}`}>
                          <h1 className="h4 text-primary ml-0 mt-0 mb-0 mb-lg-2 font-weight-bold">
                            {currentPatientDetails.fullName}
                          </h1>
                          <small className="text-muted font-13">
                            {t(currentPatientDetails.gender)} <span className="mx-2">|</span>{' '}
                            {t(currentPatientDetails.typeOfDiabetes)}{' '}
                            <span className="mx-2">|</span> {t('AGE')}{' '}
                            {`${currentPatientDetails.ageYears} ${t('YEAR')}${
                              currentPatientDetails.ageMonths
                                ? ` ${currentPatientDetails.ageMonths}` + ` ${t('MONTH')}`
                                : ''
                              }`}{' '}
                            <span className="mx-2">|</span> {t('WEIGHT')}{' '}
                            {weightConverter(
                              currentPatientDetails.weight,
                              getSettingsItem('weightUnit'),
                            )}
                            {t(getUnitEnum(getSettingsItem('weightUnit')))}{' '}
                            <span className="mx-2">|</span> {t('BMI')}{' '}
                            {calculateBMI(
                              currentPatientDetails.weight,
                              currentPatientDetails.height,
                              currentPatientDetails.weightUnit,
                              currentPatientDetails.heightUnit,
                            )}{' '}
                            <span className="mx-2">|</span>
                            {currentPatientDetails.hba1c ? (
                              <Fragment>
                                {t('HBA1C')} {currentPatientDetails.hba1c}%{' '}
                                <span className="mx-2">|</span>{' '}
                              </Fragment>
                            ) : (
                                undefined
                              )}
                            {t('COMPLICATION')}{' '}
                            {currentPatientDetails.hasComplication ? t('YES') : t('NO')}
                          </small>
                        </div>
                        <div className="col-auto">
                          <Link
                            to={{
                              pathname: `/patient-profile/${this.props.match.params.id}`,
                              state: {
                                ...currentPatientDetails,
                              },
                            }}
                            className="btn btn-white text-dark border text-dark px-4 mt-3 mt-lg-0 font-14"
                          >
                            <Icon className="mx-1" type="user" />
                            <span style={{ color: '#000', opacity: '0.65' }}>
                              {t('VIEW_COMPLETE_PROFILE')}
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <hr />
            </div>
            <div className="px-lg-4">
              <div className="container-fluid dr-container">
                <div className="row mt-5">
                  <div className="col-auto">
                    <p className="h5 medication-h5">{t('NOTE_ON_REPORT')}</p>
                  </div>
                </div>
                <hr />
                <div className="row mb-5">
                  <div className="col-12">
                    <div className="card rounded-0 bg-light px-2">
                      <div className="card-body container-fluid dr-container">
                        {this.state.reportExists ? (
                          <div className="row py-2">
                            <div className="col-4 col-md-3">
                              <span>{t('REPORT')}:</span>
                            </div>
                            <div className="col-8 col-md-9">
                              <span className="text-primary">
                                {this.getReportName(currentPatientDetails)}
                              </span>
                            </div>
                          </div>
                        ) : (
                            undefined
                          )}
                        <div className="row py-2">
                          <div className="col-4 col-md-3">
                            <span>
                              {get(this.state, 'createdByRole', '') !== role
                                ? t('FROM')
                                : t('TO')}
                              :
                            </span>
                          </div>
                          {get(this.props, 'location.state.from', '') === 'dashboard' &&
                            role === 'ROLE_EDUCATOR' ? (
                              <div className="col-8 col-md-6">
                                <div className="custom-control custom-radio custom-control-inline">
                                  <input
                                    className="form-check-input custom-control-input"
                                    type="radio"
                                    id="option1"
                                    name="recepientRadio"
                                    value="DOCTOR"
                                    onChange={this.setRecepient.bind(this, 1)}
                                    checked={this.state.value === 'DOCTOR'}
                                  />
                                  <label
                                    className="form-check-label m-0 custom-control-label"
                                    htmlFor="option1"
                                  >
                                    {t('DOCTOR')}
                                  </label>
                                </div>

                                <div className="custom-control custom-radio custom-control-inline">
                                  <input
                                    className="form-check-input custom-control-input"
                                    type="radio"
                                    name="recepientRadio"
                                    id="option2"
                                    value="DIETITIAN"
                                    onChange={this.setRecepient.bind(this, 3)}
                                    checked={this.state.value === 'DIETITIAN'}
                                  />
                                  <label
                                    className="form-check-label m-0 custom-control-label"
                                    htmlFor="option2"
                                  >
                                    {t('DIETITIAN')}
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <div className="col-8 col-md-9">
                                <span className="text-primary">
                                  {this.state &&
                                    this.state.createdByRole &&
                                    this.state.createdByRole === 'ROLE_DOCTOR' &&
                                    role === 'ROLE_DOCTOR'
                                    ? ''
                                    : ''}

                                  {this.state &&
                                    this.state.createdByRole &&
                                    this.state.createdByRole !== role
                                    ? this.state && this.state.createdByName
                                      ? `${this.state.createdByName} - ${getRole(
                                        this.state.createdByRole,
                                      )}`
                                      : ''
                                    : this.state && this.state.assignedToName
                                      ? `${this.state.assignedToName} - ${assignedToRole}`
                                      : `${sendToName} - ${assignedToRole}`}
                                </span>
                              </div>
                            )}
                        </div>
                        {reportData && reportData.reportNotes
                          ? reportData.reportNotes.map(element => (
                            <div>
                              <div className="row py-2">
                                <div className="col-4 col-md-3">
                                  <span>
                                    {this.state.loggedInUserId &&
                                      this.state.loggedInUserId == element.createdById
                                      ? t('ME')
                                      : element.createdByName}
                                    :
                                    </span>
                                </div>
                                <div className="col-8 col-md-9">
                                  <p className="mb-1">
                                    {element.noteBody}
                                    <br />
                                  </p>
                                  <p className="m-0">
                                    <small className="text-muted">
                                      {`${formatDate(new Date(element.createdDate))} at ${moment(
                                        element.createdDate,
                                      ).format('h:mm a')}`}
                                    </small>
                                  </p>
                                </div>
                              </div>
                              <hr />
                            </div>
                          ))
                          : null}
                        {MyNoteDiv}
                        <div className="row py-2">
                          <div className="col-4 col-md-3">
                            <span>{t('NOTE')}:</span>
                          </div>
                          <div className="col-12 col-md-9">
                            <form onSubmit={this.sendMessage} className="">
                              <textarea
                                cols="30"
                                rows="3"
                                className="form-control"
                                value={this.state.note}
                                onChange={this.handleNote}
                                type="text"
                                placeholder={t('WRITE_NOTE')}
                              />
                              <small className="text-muted font-10">{t('MAXIMUM_100_WORDS')}</small>
                              <div className="row">
                                <div className={`col ${config.btnDirectionType2}`}>
                                  <button
                                    className="btn btn-primary dr-send-notes-btn mt-3 mt-lg-0 font-14"
                                    type="primary"
                                    htmlType="submit"
                                    style={{ height: '32px', lineHeight: '18px' }}
                                  >
                                    <Icon type="message" />
                                    {t('SEND_NOTE')}
                                  </button>
                                </div>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <BGLPlanComponent patientId={params.id} />
                <div className="row justify-content-between align-items-end">
                  <div className="col-auto">
                    <p className="h5 medication-h5">{t('MEDICATION')}</p>
                  </div>
                  {/* <div className={activeTab === 1 && suggestedMedication ? 'tab-pane fade show active d-flex flex-nowrap ovx-a ovy-h' : 'tab-pane fade hide'}>
                   {contentSuggested}
                   </div>
                   <div className={activeTab === 2 || (activeTab === 1 && !suggestedMedication) ? 'tab-pane fade show active d-flex flex-nowrap ovx-a ovy-h' : 'tab-pane fade hide'}>
                   {content}
                   <div className="col-12">
                   <p className="text-muted mt-3 mb-0" />
                   </div>
                   </div> */}
                  <div className="col-auto">{medButton}</div>
                </div>
                <hr className="mb-md-4" />
                <div className="row mb-5">
                  <div className="col">
                    <div className="card border rounded">
                      <div className="card-header text-primary pb-0 pt-2">
                        <div className="col px-0">
                          <ul
                            className="nav nav-tabs border-bottom-0 flex-nowrap w-100 ovy-h ovx-a"
                            id="myTab"
                            role="tablist"
                          >
                            {this.tabs &&
                              this.tabs.map(tab => {
                                const className =
                                  tab.id === activeTab ||
                                    ((tab.id === 2 && activeTab === 1 && !suggestedMedication) ||
                                      (this.state.reportExists &&
                                        this.state.snapshotReport &&
                                        tab.id === 2))
                                    ? 'nav-link active'
                                    : 'nav-link text-muted';
                                // if (tab.id === 2 || (tab.id === 3 && previousData) || tab.id === 1 && suggestedMedication && suggestedMedication.medications && suggestedMedication.medications.length > 0 && suggestedMedication.medications[0].medicineId && suggestedMedication.medications[0].medicineId !== null) {
                                if (
                                  tab.id === 2 ||
                                  (tab.id === 3 && previousData) ||
                                  (tab.id === 1 &&
                                    suggestedMedication &&
                                    suggestedMedication.medications &&
                                    suggestedMedication.medications.length >= 0)
                                ) {
                                  const tabClass =
                                    !reportId &&
                                      store.getState().auth.userDetails.roles[0] === 'ROLE_DOCTOR' &&
                                      tab.id === 1
                                      ? 'nav-item text-nowrap d-none'
                                      : 'nav-item text-nowrap';
                                  return (
                                    <li className={tabClass} key={tab.id}>
                                      <a
                                        className={className}
                                        data-toggle="tab"
                                        role="tab"
                                        aria-selected="true"
                                        onClick={event => {
                                          this.setState({ activeTab: tab.id });
                                        }}
                                      >
                                        {t(tab.text)}
                                      </a>
                                    </li>
                                  );
                                } else {
                                  null;
                                }
                              })}
                          </ul>
                        </div>
                      </div>
                      {!reportId &&
                        store.getState().auth.userDetails.roles[0] === 'ROLE_DOCTOR' ? null : (
                          <div
                            style={{ height: '165px' }}
                            className={
                              activeTab === 1 && suggestedMedication && !this.state.snapshotReport
                                ? 'tab-pane fade show active d-md-flex flex-md-nowrap ovx-a'
                                : 'tab-pane fade hide'
                            }
                          >
                            {contentSuggested}
                            {!contentSuggested && (
                              <div className="col-12">
                                <p className="text-muted mt-3 mb-0">{NoteInCard}</p>
                              </div>
                            )}
                          </div>
                        )}

                      <div
                        style={{ height: '165px' }}
                        className={
                          activeTab === 2 ||
                            (activeTab === 1 && !suggestedMedication) ||
                            this.state.snapshotReport
                            ? 'tab-pane fade show active d-md-flex flex-md-nowrap ovx-a'
                            : 'tab-pane fade hide'
                        }
                      >
                        {content}
                        {!content && (
                          <div className="col-12">
                            <p className="text-muted mt-3 mb-0" />
                          </div>
                        )}
                      </div>
                      {previousData && (
                        <div
                          style={{ height: '165px' }}
                          className={
                            activeTab === 3
                              ? 'tab-pane fade show active d-md-flex flex-md-nowrap ovx-a'
                              : 'tab-pane fade hide'
                          }
                        >
                          {contentPrevious}
                          {!contentPrevious && (
                            <div className="col-12">
                              <p className="text-muted mt-3 mb-0" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="card-footer bg-white text-right">
                        {currentStatus(t)}
                      </div>
                    </div>
                  </div>
                </div>
                {currentPatientDetails.typeOfDiabetes === 'NO_DIABETIC' ||
                  currentPatientDetails.typeOfDiabetes === 'PRE_DIABETIC' ? (
                    ''
                  ) : (
                    <div className="row justify-content-between align-items-end">
                      <div className="col-auto">
                        <p className="h5 medication-h5">{t('MONITORING')}</p>
                      </div>
                      <div className="col-auto">{bglEdit}</div>
                    </div>
                  )}
                {currentPatientDetails.typeOfDiabetes === 'NO_DIABETIC' ||
                  currentPatientDetails.typeOfDiabetes === 'PRE_DIABETIC' ? (
                    ''
                  ) : (
                    <hr className="mb-md-4" />
                  )}
                {currentPatientDetails.typeOfDiabetes === 'NO_DIABETIC' ||
                  currentPatientDetails.typeOfDiabetes === 'PRE_DIABETIC' ? (
                    ''
                  ) : (
                    <div className="row mb-5">
                      <div className="col">
                        <div className="card rounded border">
                          <div className="card-header text-primary pb-0 pt-2">
                            <div className="col px-0">
                              <ul
                                className="nav nav-tabs border-bottom-0 w-100 ovy-h ovx-a flex-nowrap"
                                id="myTab"
                                role="tablist"
                              >
                                {this.tabs1 &&
                                  this.tabs1.map(tab => {
                                    const className =
                                      tab.id === activeTab1 ||
                                        ((tab.id === 2 && activeTab1 === 1 && !suggestedBGLRanges) ||
                                          (this.state.reportExists &&
                                            this.state.snapshotReport &&
                                            tab.id === 2))
                                        ? 'nav-link active'
                                        : 'nav-link text-muted';
                                    if (
                                      tab.id === 2 ||
                                      (tab.id === 3 && previousMonitoring) ||
                                      (tab.id === 1 &&
                                        suggestedBGLRanges &&
                                        suggestedBGLRanges.bglRanges &&
                                        suggestedBGLRanges.bglRanges.length)
                                    ) {
                                      const tabClass =
                                        !reportId &&
                                          store.getState().auth.userDetails.roles[0] ===
                                          'ROLE_DOCTOR' &&
                                          tab.id === 1
                                          ? 'nav-item text-nowrap d-none'
                                          : 'nav-item text-nowrap';
                                      return (
                                        <li className={tabClass} key={tab.id}>
                                          <a
                                            className={className}
                                            data-toggle="tab"
                                            role="tab"
                                            aria-selected="true"
                                            onClick={event => {
                                              this.setState({ activeTab1: tab.id });
                                            }}
                                          >
                                            {t(tab.text)}
                                          </a>
                                        </li>
                                      );
                                    } else {
                                      null;
                                    }
                                  })}
                              </ul>
                            </div>
                          </div>
                          {!reportId &&
                            store.getState().auth.userDetails.roles[0] === 'ROLE_DOCTOR' ? null : (
                              <div
                                style={{ height: '145px' }}
                                className={
                                  activeTab1 === 1 && suggestedBGLRanges && !this.state.snapshotReport
                                    ? 'tab-pane fade show active d-md-flex flex-md-nowrap ovx-a'
                                    : 'tab-pane fade hide'
                                }
                              >
                                {contentSuggestedMonitoring}
                                {!contentSuggestedMonitoring && (
                                  <div className="col-12">
                                    <p className="text-muted mt-3 mb-0">{NoteInCard}</p>
                                  </div>
                                )}
                              </div>
                            )}

                          <div
                            style={{ height: '145px' }}
                            className={
                              activeTab1 === 2 ||
                                (activeTab1 === 1 && !suggestedBGLRanges) ||
                                (this.state.reportExists && this.state.snapshotReport)
                                ? 'tab-pane fade show active d-md-flex flex-md-nowrap ovx-a'
                                : 'tab-pane fade hide'
                            }
                          >
                            {contentMonitoring}
                            {!contentMonitoring && (
                              <div className="col-12">
                                <p className="text-muted mt-3 mb-0" />
                              </div>
                            )}
                          </div>
                          {previousMonitoring && (
                            <div
                              style={{ height: '145px' }}
                              className={
                                activeTab1 === 3
                                  ? 'tab-pane fade show active d-md-flex flex-md-nowrap ovx-a'
                                  : 'tab-pane fade hide'
                              }
                            >
                              {contentPreviousMonitoring}
                              {/* {!previousMonitoring && <div className="col-12">
                                           <p className="text-muted mt-3 mb-0" />
                                           </div> */}
                            </div>
                          )}

                          <div className="card-footer bg-white text-right">
                            {activeTab1 === 1 && !this.state.snapshotReport
                              ? this.getStatusTextForMonitoring(reportData, t)
                              : activeTab1 === 2 || this.state.snapshotReport
                                ? this.getStatusTextForCurrentPrevious(currentMonitoring, t)
                                : this.getStatusTextForCurrentPrevious(previousMonitoring, t)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                <CustomModal
                  textDirection={config.textDirection}
                  btnMargin={config.btnMargin}
                  footerCancel = {t('CANCEL')}
                  footerOkLoading={this.state.isSendLoading}
                  footerOk={t('SEND')}
                  footerOkClick={this.sendToDoctor}
                  isOpen={this.state.modal}
                  close={this.toggle}
                  heading={t('ARE_YOU_SURE?')}
                  modalBody={(<p className="my-3">
                  {t('THE_REPORT_WILL_BE_SENT_TO')}
                  {this.state.assignedToName
                    ? this.state.assignedToName
                    : sendToName}
                </p>)}
                />
                <CustomModal
                  textDirection={config.textDirection}
                  btnMargin={config.btnMargin}
                  footerCancel = {t('CANCEL')}
                  footerOkLoading={this.state.isSendLoading}
                  footerOk={t('OK')}
                  isOpen={this.state.showWarningMessage}
                  close={this.toggleWarningMessage}
                  heading={t('ARE_YOU_SURE?')}
                  footerOkClick={this.updateReportStatus(reportId, 10, this.props.match.params.id)}
                  modalBody={(
                    <>
                      <p className="my-3">{t('REJECT_REPORT_MSG')}</p>
                        <p>
                          {isEnglishLanguageCode(lang)
                            ? t('REJECT_REPORT_DETAIL_MSG').replace(
                              '[Name]',
                                educatorName
                            )
                            : t('REJECT_REPORT_DETAIL_MSG').replace(
                              '[الاسم]',
                              educatorName,
                            )}
                        </p>
                    </>
                  )}
                />

                {/* APPROVE DOCTOR REPORT MODAL */}
                <CustomModal
                  textDirection={config.textDirection}
                  btnMargin={config.btnMargin}
                  footerCancel = {t('CANCEL')}
                  footerOkLoading={this.state.isSendLoading}
                  footerOk={t('OK')}
                  isOpen={this.state.showApprovePopup}
                  close={this.toggleApprovePopup}
                  heading={t('ARE_YOU_SURE?')}
                  footerOkClick={this.updateReportStatus(reportId, 9, this.props.match.params.id)}
                  modalBody={(
                    <>
                      <p className="my-3">{t('APPROVE_REPORT_MSG')}</p>
                        <p>
                          {isEnglishLanguageCode(lang)
                            ? t('APPROVE_REPORT_DETAIL_MSG').replace(
                              '[Name]', educatorName)
                            : t('APPROVE_REPORT_DETAIL_MSG').replace(
                              'الاسم',educatorName)}
                        </p>
                    </>
                  )}
                />

                {/* CREATE DOCTOR REPORT MODAL */}
                <CustomModal
                  textDirection={config.textDirection}
                  btnMargin={config.btnMargin}
                  footerCancel = {t('CANCEL')}
                  footerOkLoading={this.state.isSendLoading}
                  footerOk={t('OK')}
                  isOpen={this.state.showCreatePopup}
                  close={this.toggleCreatePopup}
                  footerOkClick={this.sendToDoctor}
                  heading={t('ARE_YOU_SURE?')}
                  modalBody={(
                      <p>
                      {isEnglishLanguageCode(lang)
                        ? t('SEND_REPORT_MSG').replace(
                          '[Recipient 1]',educatorName
                        )
                        : t('SEND_REPORT_MSG').replace(
                          'مستلم', educatorName
                        )}
                    </p>
                  )}
                />
                <CustomModal
                  textDirection={config.textDirection}
                  btnMargin={config.btnMargin}
                  footerCancel = {t('CANCEL')}
                  footerOkLoading={this.state.isSendLoading}
                  footerOk={t('LEAVE_PAGE')}
                  isOpen={this.state.showWarningMessageOnCancel}
                  close={this.toggleWarningMessageOnCancel}
                  footerOkClick={() => this.leave(this.props.match.params.id)}
                  heading={t('ARE_YOU_SURE?')}
                  modalBody={(
                      <p className="my-3">
                          {role === 'ROLE_DOCTOR'
                            ? t('CHANGES_WILL_NOT_BE_SAVED_REPORT_EDUCATOR', { name: sendToName })
                            : t('CHANGES_WILL_NOT_BE_SAVED_REPORT_DOCTOR', { name: sendToName })}
                        </p>
                  )}
                />

                <hr />
                <div className="row justify-content-between">
                  <div className="col-auto">
                    {/* Cancel */}
                    <button
                      onClick={() => this.cancel(this.props.match.params.id)}
                      className="btn btn-secondary px-3 my-1 font-14"
                      type="primary"
                    >
                      <Icon type="close-circle-o" />
                      <span className="mx-2">{t('CANCEL')}</span>
                    </button>
                  </div>
                  <div className="col col-md-auto d-flex d-md-block flex-column align-items-end">
                    {/* Send Report */}
                    {this.selectReportButton(t, config)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </I18n>
    );
  }
}
const WrappedMedicationReport = Form.create()(MedicationReport);

export default WrappedMedicationReport;