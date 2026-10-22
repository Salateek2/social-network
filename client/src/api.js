// All server communication goes through jQuery Ajax (§25).
// The Firebase ID token is attached so the server knows who we are (§21).
import $ from 'jquery';
import { getToken } from './firebase';

export async function api(method, url, data) {
  const token = await getToken();
  return $.ajax({
    method,
    url,
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    contentType: 'application/json',
    data: data ? JSON.stringify(data) : undefined,
  });
}

// Upload a file (video/image) with jQuery Ajax + FormData (§25, §26).
export async function apiUpload(file) {
  const token = await getToken();
  const fd = new FormData();
  fd.append('file', file);
  return $.ajax({
    method: 'POST',
    url: '/api/upload',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    data: fd,
    processData: false, // let the browser build the multipart body
    contentType: false,
  });
}

// Pull a readable error message out of a failed $.ajax call.
export function ajaxError(err, fallback) {
  return (
    (err && err.responseJSON && err.responseJSON.error) ||
    fallback ||
    'Something went wrong. Please try again.'
  );
}
