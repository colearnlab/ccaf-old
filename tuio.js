var tuio = new (require('epictuio'))({'oscHost': '0.0.0.0', 'oscPort': 3333, 'raw': true});
tuio.on('raw', function(data) {
  console.log(new Bundle(data.slice(2, data.length)));
});

function Bundle(data) {
  this.bundle = true;
  this.duplicate = false;
  this.messages = [];
  for (var i = 0; i < data.length; i++)
    this.messages.push(new Message(data[i]));
}

function Message(data) {
  this.profile = data[0];
  this.type = data[1];
  switch(this.type) {
    case 'alive':
      this.sessionIds = data.slice(2, data.length);
      break;
     case 'source':
      console.log(data);
      break;
     case 'set':
      this.sessionId = data[2];
      this.xPosition = data[3];
      this.yPosition = data[4];
      this.force = data[7];
      break;
  }
}