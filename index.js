const { Games } = require('@openhud/api');
const { represent } = require('@openhud/helpers');
const { texasHoldem6, omahaHoldem6 } = require('propokertools');


const generateTip = (game, seats, community) => {
    const tip = { players: {} };

    if (community.length === 0) {
        const mySeatId = seats.findIndex(seat => seat.isMe);
        if (mySeatId !== -1) {
            const mySeat = seats[mySeatId];
            const myHand = mySeat.cards;
            if (myHand.length === 0) {
                throw {
                    type: 'https://www.openhud.io/errors/invalid-data',
                    detail: 'Hero cards are missing'
                };
            }
            const myPlayerName = mySeat.playerName;

            switch (game.type) {
                case Games.TexasHoldem:
                    {
                        const myHandRep = represent({ hand: myHand });
                        const { percentile } = texasHoldem6({ hand: myHand });
                        tip.players[myPlayerName] = `${myHandRep} ranks (${(percentile * 100).toFixed(1)}%).`;
                    }
                    break;
                case Games.OmahaHoldem:
                    {
                        const myHandRep = represent({ hand: myHand });
                        const { percentile } = omahaHoldem6({ hand: myHand });
                        tip.players[myPlayerName] = `${myHandRep} ranks (${(percentile * 100).toFixed(1)}%).`;
                    }
                    break;
                default:
                    break;
            }
        }
    }

    return tip;
};

//////////

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const functions = require('firebase-functions');


const app = express()
app.use(cors({
    origin: '*', // Required to avoid chrome extension CORB error
    maxAge: 86400
}));
app.use(bodyParser.json());


const errors = {
    'https://www.openhud.io/errors/invalid-data': {
        status: 400,
        title: 'Invalid Data'
    },
    'https://www.openhud.io/errors/internal': {
        status: 500,
        title: 'Internal'
    }
};

const translateException = e => {
    const error = errors[e.type] || errors['https://www.openhud.io/errors/internal'];
    return {
        status: error.status,
        body: {
            type: e.type,
            title: error.title,
            detail: e.detail || e.message
        }
    };
};


app.post('/', (request, response) => {
    try {
        const { game, seats, community } = request.body;

        const tip = generateTip(game, seats, community);

        response.status(200).send(tip);
    } catch (e) {
        const error = translateException(e);
        response.status(error.status).send(error.body);
    }
});

const metadata = {
    title: 'ProPokerTools',
    description: 'ProPokerTools hand rankings (http://www.propokertools.com/)',
    games: [{
        type: Games.TexasHoldem,
        bet: '*',
        format: '*'
    }, {
        type: Games.OmahaHoldem,
        bet: '*',
        format: '*'
    }],
    author: {
        name: 'Danny Leshem',
        email: 'dleshem@gmail.com'
    }
};

app.get('/', (request, response) => {
    response.status(200).send(metadata);
});


module.exports = {
    openhud: functions.https.onRequest(app)
};