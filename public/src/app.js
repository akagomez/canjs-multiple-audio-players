(function () {

  /* Fixtures */

  can.fixture({
    'GET /songs': function () {
      return [
        { track: '01', title: 'Angels' },
        { track: '02', title: 'Chained' },
        { track: '03', title: 'Fiction' },
        { track: '04', title: 'Try' },
        { track: '05', title: 'Reunion' },
        { track: '06', title: 'Sunset' },
        { track: '07', title: 'Missing' },
        { track: '08', title: 'Tides' },
        { track: '09', title: 'Unfold' },
        { track: '10', title: 'Swept Away' },
        { track: '11', title: 'Our Song' },
        { track: '12', title: 'Reconsider' },
      ];
    }
  });

  /* Models */

  var SongModel = can.Model.extend({
    findAll: '/songs'
  }, {
    define: {
      secondsPlayed: {
        value: 0
      },
      fullTitle: {
        get: function () {
          return this.attr('track') + ' - ' + this.attr('title');
        }
      },
      filePath: {
        get: function () {
          return 'assets/audio/' + 
            this.attr('track') + ' ' + this.attr('title') + '.m4a';
        }
      }
    }
  });

  var PlayerModel = SongModel.extend({}, {
    define: {
      isPlaying: {
        set: function (isPlaying) {

          var sound = this.attr('sound'); 

          if (sound) {
            if (isPlaying) {
              sound.play();
            } else {
              sound.pause(); 
            }
          }

          return isPlaying; 
        }
      },
      song: {
        set: function (song) {
          if (this.attr('sound')) {
            this.attr('sound').pause(); 
          }

          // Delete all references to buzz.sound's. Removing the references 
          // will cause them to be garbage collected. I suspect it will for
          // event listeners also.
          buzz.sounds = []; 

          // Create a new sound object from the file path
          var sound = new buzz.sound(song.attr('filePath'));
          sound.setTime(song.attr('secondsPlayed'));
          
          this.attr('buzzEvents').each(function (handler, eventName) {
            sound.bind(eventName, function (ev) {
              console.log(song.attr('fullTitle') + ':', eventName);
              handler(song, sound, ev);
            });
          });

          clearInterval(this.progressPoller);
          this.progressPoller = 
            setInterval(this.createProgressPoller(sound, song), 1000 / 30);

          // Save a reference to the Buzz sound object
          this.attr('sound', sound);

          // Do the "set"
          return song
        }
      },
      buzzEvents: {
        type: 'object',
        value: {
          playing: function (song) {
            song.attr('isPlaying', true);
          },
          pause: function (song) {
            song.attr('isPlaying', false);
          }
        }
      }
    },

    createProgressPoller: function (sound, song) {
      return function () {
        var playedList = sound.getPlayed(); 
        var bufferedList = sound.getBuffered(); 
        var playedRange = playedList.length ? 
          playedList[0] : 
          { start: 0, end: 0 };
        var bufferedRange = bufferedList.length ? 
          bufferedList[0] : 
          { start: 0, end: 0 };
        
        song.attr({
          secondsPlayed: playedRange.end,
          secondsBuffered: bufferedRange.end,
          duration: sound.getDuration(),
          percentPlayed: sound.getPercent()
        });
      };
    },

    play: function () {
      this.attr('sound').play(); 
    },

    pause: function () {
      this.attr('sound').pause(); 
    }

  });

  var AppState = new (can.Map.extend({
    define: {
      player: {
        Value: PlayerModel  
      },
      songs: {
        value: []
      }, 
    },
    init: function () {
      var self = this; 

      SongModel.findAll({}).then(function (songs) {
        self.attr('songs', songs);
      });
    }
  })); 

  /* Components */

  var MediaPlayerScope = can.Map.extend({
    define: {
    
    },
    playOrPause: function () {
      var song = this.attr('song');
      var player = AppState.attr('player');

      if (song.attr('isPlaying')) {
        player.attr('isPlaying', false); 
      } else {
        player.attr('song', this.attr('song'));
        player.attr('isPlaying', true); 
      }
    }
  });

  can.Component.extend({
    tag: 'cg-player',
    template: $('#cg-player').html(),
    scope: can.extend(MediaPlayerScope, {

    })
  });

  can.Component.extend({
    tag: 'cg-song',
    template: $('#cg-song').html(),
    scope: can.extend(MediaPlayerScope, {
      
    })
  });

  /* Initialization */

  var view = can.view('#app', AppState); 
  $('body').prepend(view); 

})();