// Fonction pour encoder les patterns dans le clip
function encodePatterns(clip, patterns) {
    // Durée d'une triple croche (32e note) en beats : 0.125
    var tripleCrocheDuration = 0.125;

    // Mappage des notes MIDI (General MIDI)
    var noteMap = {
        "kickpattern": 36,   // Kick
        "snarepattern": 38,  // Snare
        "hiHatPattern": 42,  // Hi-Hat
        "tompattern": 50,    // Tom
        "clappattern": 39    // Clap
    };

    // Tableau pour stocker toutes les notes
    var notes = [];

    // Parcourir chaque pattern et ajouter les notes
    for (var patternName in patterns) {
        var pattern = patterns[patternName];
        var notePitch = noteMap[patternName];

        for (var i = 0; i < pattern.length; i++) {
            if (pattern[i] === 1) {
                // Calculer le temps en beats (double croche = 0.25 beat)
                var startTime = i * 0.25;
                // Ajouter une note au tableau
                notes.push({
                    pitch: notePitch,
                    start_time: startTime,
                    duration: tripleCrocheDuration,
                    velocity: 100,
                    mute: 0
                });
            }
        }
    }

    // Ajouter toutes les notes au clip en une seule fois
    clip.call("add_new_notes", { notes: notes });
    post("Patterns encodés dans le clip avec add_new_notes !\n");
}

// Fonction pour créer le clip et encoder les patterns
function createClipAndEncode(patterns) {
    // Device courant
    var device = new LiveAPI("this_device");
    post("DEVICE PATH:", device.path, "\n");

    // Remonter directement à la piste
    device.goto("canonical_parent");
    var trackPath = device.path;
    var trackIndex = parseInt(trackPath.split(" ")[2]);
    post("TRACK INDEX:", trackIndex, "\n");

    // Vérifier que c'est une piste MIDI
    if (device.get("has_midi_input") == 1) {
        // Créer une nouvelle scène
        var liveSet = new LiveAPI("live_set");
        liveSet.call("create_scene", -1); // -1 pour ajouter à la fin

        // Récupérer le nombre de scènes pour obtenir l'index de la nouvelle scène
        var scenesCount = liveSet.getcount("scenes");
        var newSceneIndex = scenesCount - 1;
        post("Nouvelle scène créée à l'index :", newSceneIndex, "\n");

        // Cibler le slot correspondant à la piste dans cette nouvelle scène
        var newSceneSlotPath = "live_set scenes " + newSceneIndex + " clip_slots " + trackIndex;
        var newSceneSlot = new LiveAPI(newSceneSlotPath);

        // Créer un clip MIDI de 16 beats (pour 64 pas en double croche)
        newSceneSlot.call("create_clip", 16);
        post("Clip MIDI créé dans le slot " + trackIndex + " de la nouvelle scène " + newSceneIndex + " !\n");

        // Attendre que le clip soit créé
        var clip = new LiveAPI(newSceneSlotPath + " clip");
        var maxAttempts = 10;
        var attempts = 0;

        // Vérifier que le clip est prêt
        function checkClipReady() {
            if (clip.get("exists") == 1) {
                post("Clip prêt !\n");
                encodePatterns(clip, patterns);
            } else if (attempts < maxAttempts) {
                attempts++;
                defer(checkClipReady, 100); // Réessayer dans 100ms
            } else {
                post("Erreur : impossible de créer le clip.\n");
            }
        }
        checkClipReady();
    } else {
        post("La piste n'est pas une piste MIDI.\n");
    }
}

// Fonction appelée quand un dictionnaire est reçu par l'inlet
function msg_dictionary(dict) {
    post("Dictionnaire reçu :", JSON.stringify(dict), "\n");
    createClipAndEncode(dict);
}
