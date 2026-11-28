'use strict';

// BITEX hosting only. Initialize the user's queue before the async GTM script.
// Keep this local file in the verified offline package; never cache Google's JS.
window.dataLayer = window.dataLayer || [];
function gtag(){ window.dataLayer.push(arguments); }
gtag('js', new Date());

// Standard GTM page-load event: the supplied container uses a gtm.js trigger.
// No calculator state, expressions, key history or feedback is added here.
window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
