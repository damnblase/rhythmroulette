post('loaded liveAPI.js')
const liveObject = new LiveAPI("live_set");

function anything() {
  const name = messagename;
  const value = arrayfromargs(arguments);
  // post('liveAPI.js received : ', messagename, arrayfromargs(arguments));
  switch(name) {
    case 'tempo': {
      post('new liveAPI tempo', value);
      liveObject.set("tempo", value);
    }
  }
}


