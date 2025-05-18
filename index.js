/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var xhub = require('express-x-hub');
var path = require('path');
var axios = require('axios');

var app = express();
app.set('port', process.env.PORT || 5000);

var token = process.env.TOKEN || 'token';
var received_updates = [];

// Middleware: Logging
app.use(morgan('combined')); // ✅ Standard request logs

// ✅ Custom logger for full detail (headers + body)
app.use((req, res, next) => {
  console.log(`\n🔹 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log('🔸 Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length) {
    console.log('🔸 Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Other middleware
app.use(xhub({ algorithm: 'sha1', secret: process.env.APP_SECRET }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Serve static HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/results', (req, res) => {
  res.send('<pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/delete-request', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'delete-request.html'));
});

app.get('/terms-of-service', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms-of-service.html'));
});

// Facebook / Instagram / Threads verification
app.get(['/facebook', '/instagram', '/threads'], (req, res) => {
  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === token
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

// Facebook webhook
app.post('/facebook', (req, res) => {
  console.log('✅ Facebook request body:', req.body);

  if (!req.isXHubValid()) {
    console.log('⚠️ Invalid X-Hub-Signature');
    res.sendStatus(401);
    return;
  }

  console.log('✅ X-Hub-Signature validated');
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

// Instagram webhook
app.post('/instagram', (req, res) => {
  console.log('✅ Instagram request body:', req.body);
  received_updates.unshift(req.body);

  // Forward to primary webhook
  axios.post(process.env.N8N_WEBHOOK, req.body)
    .then(response => {
      console.log('➡️ Primary webhook success:', response.status);
      received_updates.unshift({ primary_webhook: { status: response.status } });
    })
    .catch(error => {
      console.error('❌ Primary webhook error:', error.message);
      received_updates.unshift({ primary_webhook: { error: error.message } });
    });

  // Optionally forward to test webhook
  if (process.env.SEND_TO_TEST_WH && process.env.TEST_WEBHOOK) {
    axios.post(process.env.TEST_WEBHOOK, req.body)
      .then(response => {
        console.log('➡️ Test webhook success:', response.status);
        received_updates.unshift({ test_webhook: { status: response.status } });
      })
      .catch(error => {
        console.error('❌ Test webhook error:', error.message);
        received_updates.unshift({ test_webhook: { error: error.message } });
      });
  }

  res.sendStatus(200);
});

// Threads webhook
app.post('/threads', (req, res) => {
  console.log('✅ Threads request body:', req.body);
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

// Start server
app.listen(app.get('port'), () => {
  console.log(`🚀 Node app is running on port ${app.get('port')}`);
});
