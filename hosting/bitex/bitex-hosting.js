'use strict';

// BITEX hosting only. The verified calculator and Netlify build are unchanged.
// There is no feedback API on this static deployment. Fail closed rather than
// interpreting an Apache static-page response as a successful submission.
(function configureBitexHosting880() {
  const form=document.getElementById('feedback-form');
  if (!form) return;
  for (const control of form.querySelectorAll('input, textarea, button')) control.disabled=true;
  const message=document.getElementById('feedback-status');
  const notice='Gửi góp ý trực tuyến chưa bật trên hosting BITEX. Bạn có thể tải PNG hoặc JSON trong Nhật ký phím để gửi cho đội kiểm tra.';
  if (message) message.textContent=notice;
  form.addEventListener('submit',event=> {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (message) message.textContent=notice;
  },{capture:true});
})();
