import axios from 'axios';
// import * as Utils from '../../util/utils';
import config from './aa-config.json';
import AAUtils from './utils';

class AccountAggregator {

    static getHTTPClient = () => {
        const instance = axios.create({
            baseURL: config.baseURL
        });
        instance.interceptors.response.use((response) => {
            response = response.data;
            // let status = response.status;
            // if (typeof response.status != 'boolean') {
            //     status = response.status === "SUCCESS" ? true : false
            // }
            return response;
        }, (error) => {
            return Promise.reject({
                errorDetails: {
                    errorCode: error.response.data.errorCode,
                    errorMessage: error.response.data.errorMessage
                }
            })
        })
        return instance;
    }

    static getAuthHeader = () => {
        return {
            "Content-Type": "application/json",
            "organisationId": config.organisationId,
            "client_id": config.clientId,
            "client_secret": config.clientSecret,
            "appIdentifier": config.appIdentifier
        }
    }

    static getSessionHeader = (sessionId) => {
        return {
            "Content-Type": "application/json",
            "sessionId": sessionId
        }
    }

    static getAAHeader = () => {
        return {
            "Content-Type": "application/json",
            "client_api_key": config.client_api_key
        }
    }

    static checkIfExistingUser = (phoneNumber) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let vua = `${phoneNumber}@onemoney`;
        return httpClient.post('/user/verifyvua', { vua }, { headers: AccountAggregator.getAuthHeader() }).then((response) => {
            console.log(response);
            return response.status;
        }).catch(err => {
            console.log(err);
            return Promise.reject(err);
        })
    }

    static signUpUser = (name, phoneNumber) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            name: name,
            phone_number: phoneNumber,
            terms_and_conditions: true
        }
        return httpClient.post('/user/signupwithsdk', body, { headers: AccountAggregator.getAuthHeader() }).then((response) => {
            console.log(response);
            return response.username;
        }).catch(err => {
            return Promise.reject(err);
        })
    }

    static verifyOtpForSignUp = (username, otp) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            username: username,
            code: otp
        }
        let headers = {
            "Content-Type": "application/json"
        }
        return httpClient.post('/user/otp', body, { headers: headers }).then((response) => {
            console.log(response);
            return response;
        }).catch(err => {
            console.log(err);
            return Promise.reject(err);
        })
    }

    static setUserVua = (phoneNumber) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            phone_number: phoneNumber,
            vua: `${phoneNumber}@onemoney`
        }
        let headers = {
            "Content-Type": "application/json"
        }
        return httpClient.post('/user/setvua', body, { headers: headers }).then((response) => {
            console.log(response);
            return response.status;
        }).catch(err => {
            console.log(err);
            return Promise.reject();
        })
    }

    static initializeSession = (phoneNumber) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            "vua": `${phoneNumber}@onemoney`
        }
        return httpClient.post('/user/initsession', body, { headers: AccountAggregator.getAuthHeader() }).then((response) => {
            console.log(response);
            return response.sessionId;
        }).catch(err => {
            console.log(err);
            return Promise.reject();
        })
    }

    static verifyOtpAndGetSessionForSignUp = (username, otp) => {
        return AccountAggregator.verifyOtpForSignUp(username, otp).then((response) => {
            return AccountAggregator.setUserVua(username);
        }).then((status) => {
            return AccountAggregator.initializeSession(username);
        }).then((sessionId) => {
            return sessionId;
        })
    }

    static triggerOtpForLogin = (phoneNumber) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            "phone_number": phoneNumber
        }
        return httpClient.post('/app/loginwithotp/send', body, { headers: AccountAggregator.getAuthHeader() }).then((response) => {
            console.log(response);
            return response.otp_reference;
        }).catch((err) => {
            console.log(err);
            return Promise.reject(err);
        })
    }

    static verifyOtpForLogin = (phoneNumber, otpReference, otp) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            "phone_number": phoneNumber,
            "otp_reference": otpReference,
            "code": otp
        }
        return httpClient.post('/app/loginwithotp/verify', body, { headers: AccountAggregator.getAuthHeader() }).then((response) => {
            console.log(response);
            return response.sessionId;
        }).catch(err => {
            console.log(err);
            return Promise.reject(err);
        })
    }

    static placeConsentRequest = (consentDetails, progressCallback) => {
        let httpClient = AccountAggregator.getHTTPClient();
        progressCallback(10, 'Preparing Data to place Consent Request');
        let body = AAUtils.createConsentBody(consentDetails);
        let headers = AccountAggregator.getAAHeader();
        setTimeout(() => {
            progressCallback(25, 'Sending Consent Request');
        }, 1000);
        return httpClient.post('/aa/Consent', body, { headers: headers });
    }

    static getConsentRequestDetails = (consentHandles, sessionId) => {
        let httpClient = AccountAggregator.getHTTPClient();
        if (!Array.isArray(consentHandles)) {
            consentHandles = [consentHandles];
        }
        let body = {
            consentHandles: consentHandles
        }
        return httpClient.post('/sdk/api/v1/bulkconsent/info', body, { headers: AccountAggregator.getSessionHeader(sessionId) });
    }

    static triggerOTPForAcceptConsent = (identifierValue, identifierType, sessionId) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            "actionType": "CONSENT_CONFIRMED",
            "identifierValue": identifierValue,
            "identifierType": identifierType
        }
        return httpClient.post('/app/otp/send', body, { headers: AccountAggregator.getSessionHeader(sessionId) });
    }

    static triggerOTPForRejectConsent = (identifierValue, identifierType, sessionId) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            "actionType": "CONSENT_REJECT",
            "identifierValue": identifierValue,
            "identifierType": identifierType
        }
        return httpClient.post('/app/otp/send', body, { headers: AccountAggregator.getSessionHeader(sessionId) });
    }

    static approveConsent = (consentHandles, otp, accounts, sessionId) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            "consentHandle": consentHandles,
            "otp": otp,
            "accounts": accounts
        }
        return httpClient.post('/sdk/api/v1/consentwithauth/allow', body, { headers: AccountAggregator.getSessionHeader(sessionId) });
    }

    static rejectConsent = (consentHandles, otp, sessionId) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let body = {
            "consentHandle": consentHandles,
            "otp": otp,
        }
        return httpClient.post('/sdk/api/v1/consentwithauth/deny', body, { headers: AccountAggregator.getSessionHeader(sessionId) });
    }

    static getConsentHandleStatus = (consentHandle, progressCallback, resolve, reject) => {
        let httpClient = AccountAggregator.getHTTPClient();
        let headers = AccountAggregator.getAAHeader();
        return httpClient.get(`/aa/Consent/handle/${consentHandle}`, { headers: headers })
            .then((response) => {
                progressCallback(75, 'Waiting for your approval');
                if (response.ConsentStatus && response.ConsentStatus.status === "READY") {
                    if (!resolve) {
                        return response;
                    }
                    return resolve(response);
                }
                return new Promise((_resolve, _reject) => {
                    setTimeout(() => {
                        AccountAggregator
                            .getConsentHandleStatus(consentHandle, progressCallback, _resolve, _reject)
                            .then((response) => {
                                return _resolve(response);
                            })
                            .catch(error => {
                                _reject(error);
                            })
                    }, 10000)
                })
            })
    }

    static placeDataRequest = (consentId, progressCallback, saveNonce) => {
        let httpClient = AccountAggregator.getHTTPClient();
        progressCallback(10, 'Preparing data for data request');
        let headers = AccountAggregator.getAAHeader();
        return AAUtils.createDataRequestBody(consentId).then((body) => {
            progressCallback(25, 'Sending Data Request');
            saveNonce(body.KeyMaterial.Nonce);
            return httpClient.post('/aa/FI/request', body, { headers: headers });
        })
    }

    static getData = (sessionId, progressCallback, resolve, reject, count = 0) => {
        if (!sessionId) {
            return
        }
        let httpClient = AccountAggregator.getHTTPClient();
        let headers = AccountAggregator.getAAHeader();
        return httpClient.get(`/aa/FI/fetch/${sessionId}`, { headers: headers })
            .then((response) => {
                progressCallback(60, 'Waiting for FIP to send the data');
                if (response && response.FI.length > 0) {
                    if (!resolve) {
                        return response;
                    }
                    return resolve(response);
                }
                if (count > 5) {
                    return Promise.reject("RETRY");
                }
                return new Promise((_resolve, _reject) => {
                    count++;
                    setTimeout(() => {
                        AccountAggregator.getData(sessionId, progressCallback, _resolve, _reject)
                            .then((response) => {
                                return _resolve(response);
                            }).catch((error) => {
                                _reject(error);
                            })
                    }, 10000);
                })
            }).catch((error) => {
                console.log(error);
                if (count > 5) {
                    return Promise.reject("RETRY");
                }
                if (error.errorDetails && error.errorDetails.errorCode === "NoDataFound") {
                    return new Promise((_resolve, _reject) => {
                        count++;
                        setTimeout(() => {
                            AccountAggregator.getData(sessionId, progressCallback, _resolve, _reject)
                                .then((response) => {
                                    return _resolve(response);
                                }).catch((error) => {
                                    _reject(error);
                                })
                        }, 10000);
                    })
                }
                return Promise.reject(error);
            })
    }

}

export default AccountAggregator;