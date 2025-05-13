/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var xhub = require('express-x-hub');
var path = require('path');

app.set('port', (process.env.PORT || 5000));

app.use(xhub({ algorithm: 'sha1', secret: process.env.APP_SECRET }));
app.use(bodyParser.json());
app.use(express.static('public'));

var token = process.env.TOKEN || 'token';
var received_updates = [];

// Serve HTML pages
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/privacy-policy', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/delete-request', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'delete-request.html'));
});

app.get('/terms-of-service', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'terms-of-service.html'));
});

app.get(['/facebook', '/instagram', '/threads'], function(req, res) {
    if (
        req.query['hub.mode'] == 'subscribe' &&
        req.query['hub.verify_token'] == token
    ) {
        res.send(req.query['hub.challenge']);
    } else {
        res.sendStatus(400);
    }
});

app.post('/facebook', function(req, res) {
    console.log('Facebook request body:', req.body);

    if (!req.isXHubValid()) {
        console.log('Warning - request header X-Hub-Signature not present or invalid');
        res.sendStatus(401);
        return;
    }

    console.log('request header X-Hub-Signature validated');
    // Process the Facebook updates here
    received_updates.unshift(req.body);
    res.sendStatus(200);
});

app.post('/instagram', function(req, res) {
    console.log('Instagram request body:');
    console.log(req.body);
    // Process the Instagram updates here
    received_updates.unshift(req.body);
    res.sendStatus(200);
});

app.post('/threads', function(req, res) {
    console.log('Threads request body:');
    console.log(req.body);
    // Process the Threads updates here
    received_updates.unshift(req.body);
    res.sendStatus(200);
});

// Start the server
app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
}); 