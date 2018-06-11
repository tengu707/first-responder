const express = require("express");
var compression = require('compression');
var helmet = require('helmet');

const app = express();

const Sequelize = require("Sequelize");
const passport = require("passport"),
LocalStrategy = require("passport-local").Strategy

var Handlebars  = require('express-handlebars');

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;

// Refactor to use passport
var currentUser = {};

var db

var currentReport = "";
var currentReportName = "";

var reports = {};

var vitalSigns = {};

var reportAuthor = "";

const handlebars = require("express-handlebars").create({
    defaultLayout: 'main',
    helpers: {
        list: function(items, options) {
            var out = "";

            for(var i=0, l=items.length; i<l; i++) {
                out = out + options.fn(items[i]);
            }
            return out;
        },
        equal: function(arg1, arg2, options) {
            return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
        }
    }

});

app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');

app.set("port", process.env.PORT || 8080);

app.use((require("body-parser")()));
app.use(compression({filter: shouldCompress}))

function shouldCompress (req, res) {
    if (req.headers['x-no-compression']) {
      // don't compress responses with this request header
      return false
    }
   
    // fallback to standard filter function
    return compression.filter(req, res)
  }

app.use(helmet());

app.use(express.static(__dirname + '/public'));

passport.use(
    new LocalStrategy(function(username, password, done) {
        db.collection('User').find({ username: username }).toArray(function(err, user) {
            if (!user) {
            console.log("No User");
            return done(null, false);
            }
            if(password === user[0].password) {
                console.log("Success Local Strategy");
                currentUser = {username: user[0].username, ID: user[0]._id};
                return done(null, user);
            } else {
                console.log("Password Fail");
                return done(null, false);
            }
        })
    })
);

passport.serializeUser(function(user, done) {
    done(null, user[0]._id);
    console.log("Success Serialize");
});

/* needs to be integrated to mongodb */
passport.deserializeUser(function(id, done) {
    User.findById(id)
        .then(user => {
        if (user) {
            done(null, user);
        } else {
            done(null, false);
        }
        })
        .catch(err => done(err, false));
    console.log("Success deserialize");
});

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (request, response) => {
  response.render('home')
});

app.get("/assessmentTriangle", (request, response) => {
    response.render('assessmentTriangle', {reportName: currentReportName})
});

app.get("/sceneSizeUp", (request, response) => {
    db.collection('Report').find({ _id: currentReport }).toArray(function(err, reports) {  
        response.render('sceneSizeUp', {reportName: reports[0].reportName, safety: reports[0].safety, bsi: reports[0].bsi, numOfPatients: reports[0].numOfPatients, spineInjury: reports[0].spineInjury, addResources: reports[0].addResources, mechanismOfInjury: reports[0].mechanismOfInjury})
    })
});

app.get("/consent", (request, response) => {
    response.render('consent')
});

app.get("/initialAssessment", (request, response) => {
    db.collection('Report').find({ _id: currentReport }).toArray(function(err, reports) {  
        response.render('initialAssessment', {reportName: reports[0].reportName, airway: reports[0].airway, breathing: reports[0].breathing, pulse: reports[0].pulse, bleeding: reports[0].bleeding, disability: reports[0].disability, expose: reports[0].expose, generalImpression: reports[0].generalImpression})
    })
});

app.get("/vitalSigns", (request, response) => {
    db.collection('Report').find({ _id: currentReport }).toArray(function(err, reports) {  
        response.render('vitalSigns', {reportName: reports.reportName})
    })
});

app.get("/headToToe", (request, response) => {
    db.collection('Report').find({ _id: currentReport }).toArray(function(err, reports) {  
        response.render('headToToe', {reportName: reports[0].reportName, headToToe: reports[0].headToToe})
    })
});

app.get("/sampleHistory", (request, response) => {
    db.collection('Report').find({ _id: currentReport }).toArray(function(err, reports) {  
        response.render('sampleHistory', {reportName: reports[0].reportName, name: reports[0].name, age: reports[0].age, gender: reports[0].gender, symptoms: reports[0].symptoms, allergy: reports[0].allergy, meds: reports[0].meds, intake: reports[0].intake, bowel: reports[0].bowel, events: reports[0].events})
    })
});

app.get("/reportList", (request, response) => {
    db.collection('Report').find({}).toArray(function(err, reports) {  
        response.render('reportList', {reports: reports})
    })
});


app.get("/Report/:id", (request, response) => {
    currentReport = ObjectId(request.params.id);
    db.collection('Report').find({ _id: currentReport }).toArray(function(err, reports) {  
        currentReportName = reports[0].reportName;
    });
    response.redirect(303, '/document');
});

/* Needs to be integrated with Mongodb and a page made */
app.post("/deleteReport", (req, res) => {
    Report.destroy({
        where: { ID: reports.ID }
    });
    res.render('success');
});

app.get("/newuser", (request, response) => {
    response.render('newuser');
});

app.post("/newuser", function(req, res) {
    db.collection('User').save({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        department: req.body.department,
        username: req.body.username,
        password: req.body.password
    }).then(function(user) {
        console.log('Successful user Creation');
    }).catch(function(err) {
        console.log(err, req.body)
    });
    res.redirect(303, '/success');
});

app.get("/newReport", (request, response) => {
    response.render('newReport');
});

app.post("/newReport", function(req, res) {
    if( currentUser !== {} ) {
        db.collection('Report').save(
            {
                authorID: currentUser.ID,
                reportName: req.body.reportName,
                safety: null,
                bsi: null,
                numOfPatients: null,
                spineInjury: null,
                addResources: null,
                mechanismOfInjury: null,
                consent: null,
                airway: null,
                breathing: null,
                pulse: null,
                bleeding: null,
                disability: null,
                expose: null,
                headToToe: null,
                name: null,
                age: null,
                gender: null,
                symptoms: null,
                allergy: null,
                meds: null,
                intake: null,
                bowel: null,
                events: null,
                generalImpression: null
            }, (err, result) => {
                if (err) return console.log(err)
                currentReport = result.ops[0]._id;
                res.render('sceneSizeUp');
            });
        
    }
    else {
        res.send("<a href='/newuser'>You must be signed into an account in order to create a Report.<a>");
    }

});

app.post("/sceneSizeUp", function(req, res) {
    if( currentUser !== {} ) {
        db.collection('Report').updateOne({_id: currentReport},
            {$set: {
                safety: req.body.safety,
                bsi: req.body.bsi,
                numOfPatients: req.body.numOfPatients,
                spineInjury: req.body.spineInjury,
                addResources: req.body.addResources,
                mechanismOfInjury: req.body.mechanismOfInjury
            } },
            { upsert:true }
        );
        res.render('consent');
    }
    else {
        res.send("<a href='/newuser'>You must be signed into an account in order to edit a Report.<a>");
    }
});

app.post("/consent", function(req, res){
    if(req.body.consent === "y") {
        db.collection('Report').find({ _id: currentReport }).toArray(function(err, reports) {
            res.render('initialAssessment', {reportName: reports[0].reportName, airway: reports[0].airway, breathing: reports[0].breathing, pulse: reports[0].pulse, bleeding: reports[0].bleeding, disability: reports[0].disability, expose: reports[0].expose, generalImpression: reports[0].generalImpression})
        })
    }
    else{
        res.send("<a href='/consent'>You must get consent before continuing.<a>");
    }
});

app.post("/initialAssessment", function(req, res) {
    if( currentUser !== {} ) {
        db.collection('Report').updateOne({_id: currentReport},
            {$set: {
                airway: req.body.airway,
                breathing: req.body.breathing,
                pulse: req.body.pulse,
                bleeding: req.body.bleeding,
                disability: req.body.disability,
                expose: req.body.expose,
                generalImpression: req.body.generalImpression
            } },
            { upsert:true }
        );
        res.render('assessmentTriangle', {reportName: currentReportName});
    }
    else {
        res.send("<a href='/newuser'>You must be signed into an account in order to edit a Report.<a>");
    }
});

app.post("/vitalSigns", function(req, res) {
    if( currentUser !== {} ) {
        db.collection('VitalSign').save(
            {
                authorID: currentUser.ID,
                reportName: currentReport,
                anox4: req.body.anox4,
                anox4Other: req.body.anox4Other,
                pulseRate: req.body.pulseRate,
                pulseStrength: req.body.pulseStrength,
                pulseRhythm: req.body.pulseRhythm,
                breathingRate: req.body.breathingRate,
                breathingQuality: req.body.breathingQuality,
                systolicBP: req.body.systolicBP,
                diastolicBP: req.body.diastolicBP,
                skinColor: req.body.skinColor,
                skinTemp: req.body.skinTemp,
                skinMoisture: req.body.skinTemp
            }
    );
        res.render('assessmentTriangle', {reportName: currentReportName});
    }
    else {
        res.send("<a href='/newuser'>You must be signed into an account in order to edit a Report.<a>");
    }
});

app.post("/sampleHistory", function(req, res) {
    if( currentUser !== {} ) {
        db.collection('Report').updateOne({_id: currentReport},
            {$set: {
                name: req.body.name,
                age: req.body.age,
                gender: req.body.gender,
                symptoms: req.body.symptoms,
                allergy: req.body.allergy,
                meds: req.body.meds,
                intake: req.body.intake,
                bowel: req.body.bowel,
                events: req.body.events
            } },
            { upsert:true }
    );
        res.render('assessmentTriangle', {reportName: currentReportName});
    }
    else {
        res.send("<a href='/newuser'>You must be signed into an account in order to edit a Report.<a>");
    }
});

app.post("/headToToe", function(req, res) {
    if( currentUser !== {} ) {
        db.collection('Report').updateOne({_id: currentReport},
            {$set: {
                headToToe: req.body.headToToe
            } },
            { upsert:true }
    );
        res.render('assessmentTriangle', {reportName: currentReportName});
    }
    else {
        res.send("<a href='/newuser'>You must be signed into an account in order to edit a Report.<a>");
    }
});

app.get("/document", (request, response) => {
    db.collection('Report').find({ _id: currentReport }).toArray(function(err, reports) {  
        db.collection('VitalSign').find({ reportName: currentReport }).toArray(function(err, vitalSigns) { 
            response.render('document', {reports: reports[0], vitalSigns: vitalSigns})
        })
    })
});

app.get("/logIn", (request, response) => {
    response.render('logIn');
});

app.post("/login", (req, res, next) => {
    passport.authenticate("local", {
      successRedirect: "/success",
      failureRedirect: "/login"
    })(req, res, next);
    console.log("Success Login");
  });

app.get("/success", (request, response) => {
    response.render('success',{currentUser: currentUser.username, currentReport: currentReportName});
});

app.use((request, response) => {
  response.status(404);
  response.render('404');
});

MongoClient.connect('mongodb://user2:L36e21o707@ds139920.mlab.com:39920/firstrecorder1', (err, client) => {
    if (err) { return console.log(err) }
    db = client.db('firstrecorder1');
    app.listen(app.get("port"), () => {
        console.log(
            "Express started on http://localhost:" +
            app.get("port") +
            "; press Ctrl-C to terminate."
        );
    })
});
