## MessageBus
[![Build Status](https://travis-ci.org/MailOnline/message-bus-js.svg?branch=master)](https://travis-ci.org/MailOnline/message-bus-js) [![Greenkeeper badge](https://badges.greenkeeper.io/MailOnline/message-bus-js.svg)](https://greenkeeper.io/)

A message passing framework for JavaScript.

### Differences from an Event Driven approach

Functionally almost none. 

But in event-driven systems, the "source" of the event is an important part of it. For messages, not so.

Therefore if the receipts needs to know who the source is, add that to the message payload.
