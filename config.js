const today = Utilities.formatDate(new Date(), "America/Chicago", "yyyyMMdd");
const FLAGS = {
    ENABLE_TEXTING: false,
    ENABLE_CALENDLY_INTEGRATION: true,
    IN_TEST_MODE: false
    // Add more as needed
  };

const CONFIG = {
  sheetColumns: {
    COLUMN_PASS: 16,  // Q
    COLUMN_ID: 10    // K
  },
  links: {
    tinyUrl: "https://tinyurl.com/ynvunmp5",
    calendly: "https://calendly.com/drive-sally/fleet-chauffeur-group-interview",
    googleForm: "https://forms.gle/J8p32uqXAuQSCQP48"
  },
  texts: {
    prescreenFormTextToSend: `[DRIVE SALLY]
Hi! Thanks for your interest in the Drive Sally Chauffeur team. We think you’d be a great fit. Please complete this quick form to move forward: https://forms.gle/J8p32uqXAuQSCQP48`,
    prescreenSecondOutreach: `[DRIVE SALLY]  
Just checking in — we noticed you haven’t completed the form to move forward with the Drive Sally Chauffeur team.  
If you're still interested, please fill it out here: https://forms.gle/J8p32uqXAuQSCQP48  
If not, just let us know.`,
    prescreenThirdOutreach: `[DRIVE SALLY]  
This is our final follow-up — we saw you still haven’t completed the form to move forward with the Drive Sally Chauffeur team.  
If you're still interested, please fill it out here: https://forms.gle/J8p32uqXAuQSCQP48  
If not, just let us know.`,
    prescreenReject: `[DRIVE SALLY] Thank you for participating in the Chauffeur pre-screening process. After comprehensive evaluation, we have determined that your current credentials do not satisfy Drive Sally's internal standards. To consider a vehicle through our traditional rental program, please reply YES. You may re-submit your Chauffeur application after a minimum period of 30 days.`,
    blacklistReject: `[DRIVE SALLY]
We’re very interested in your Chauffeur application. However, there’s an outstanding balance on your Drive Sally account. Please reply if you’d like help resolving it. Once the balance is cleared, we’d be happy to reconsider your application.`,
    interviewTextToSend: `Success! You’ve passed our prescreen.
Next step: Book your in-person interview at Drive Sally Chicago (1270 S Kostner Ave).
Schedule here: https://calendly.com/drive-sally/fleet-chauffeur-group-interview`,
    interviewFirstFollowup: `Just a reminder to book your in-person interview at Drive Sally Chicago (1270 S Kostner Ave):
https://calendly.com/drive-sally/fleet-chauffeur-group-interview

If you’re no longer interested, just let us know. Otherwise, we’re looking forward to meeting you!`,
    baseCriteriaRejectText: `[DRIVE SALLY]
Thank you for your interest in the Chauffeur team. At this time, your profile does not meet the initial requirements for our Chauffeur program. If you’d like to explore other vehicle options, reply YES to learn more.`
  },
  convoNames: {
    interviewText: `Chauffeur_interview_${today}`,
    prescreenFormText: `Chauffeur_form_${today}`,
    prescreenSecondOutreach: `Chauffeur_form2_${today}`,
    prescreenThirdOutreach: `Chauffeur_form3_${today}`,
    initial_criteria_reject: `Chauffeur_base_reject_${today}`,
    prescreen_reject:  `Chauffeur_prescreen_reject_${today}`,
    blacklist_reject: `Chauffeur_blacklist_reject_${today}`,
    interview_followup_1:  `Chauffeur_interview2_${today}`
  },
  sheetIds: {
    formResponses: '1Y_STyBMkrjny5XXUIfKx7T8BibTMvJJGyF5BeBMujmA',
    massText: '1pjuAOTdJpD_CVt__WrlF041iTzmtWqIThs1G2flItpo',
    prospects: '1O7OLAEZ4DtACXUz6g960e-2TwSX9xU9Aym3Bumv5vvA'
  },
  get sheets() {
    return {
      formResponses: SpreadsheetApp.openById(this.sheetIds.formResponses).getSheetByName('Form Responses 1'),
      candidatePipeline: SpreadsheetApp.openById(this.sheetIds.formResponses).getSheetByName('Candidate Pipeline'),
      calendly: SpreadsheetApp.openById(this.sheetIds.formResponses).getSheetByName('CALENDLY'),
      errors: SpreadsheetApp.openById(this.sheetIds.formResponses).getSheetByName('ERRORS'),
      textGeorge: SpreadsheetApp.openById(this.sheetIds.massText).getSheetByName('TEXT GEORGE'),
      sentTexts: SpreadsheetApp.openById(this.sheetIds.massText).getSheetByName('SENT TEXTS'),
      prospects: SpreadsheetApp.openById(this.sheetIds.prospects).getSheetByName('PROSPECTS'),
    };
  }
};
