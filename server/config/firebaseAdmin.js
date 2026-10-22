// Firebase Admin (server side). The React client logs users in with Firebase
// (client/src/firebase.js) and sends an ID token with every request; this module
// lets the server VERIFY those tokens so permissions stay server-side (§21).
//
// Setup (one time):
//   Firebase console -> Project settings -> Service accounts -> Generate new private key
//   Save the downloaded file as: server/config/serviceAccountKey.json
//   (It is gitignored — NEVER commit it, assignment §7.)
const path = require('path');
const admin = require('firebase-admin');

let app = null;
let initError = null;

function getAdmin() {
  if (app) return admin;
  if (initError) throw initError;
  try {
    const keyPath =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      path.join(__dirname, 'serviceAccountKey.json');
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const serviceAccount = require(keyPath);
    app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return admin;
  } catch (err) {
    initError = new Error(
      'Firebase Admin is not configured. Download a service account key from the ' +
        'Firebase console and save it as server/config/serviceAccountKey.json'
    );
    initError.status = 500;
    throw initError;
  }
}

module.exports = getAdmin;
