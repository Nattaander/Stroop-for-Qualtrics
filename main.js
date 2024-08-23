//################
//  JS Stroop for Qualtrics
//  Copyright (C) 2024 Aaron Bolger / School of Applied Psychology, UCC

//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.

//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.

//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <https://www.gnu.org/licenses/>.
//################

var TOTALTRIALS = 128;		//128						// total number of trials
var NUMBEROFSUBBLOCKS = 2;							// how many blocks to split the trials into with breaks between them
var BLOCKBREAKTIME = 10000;						// how long is the break between blocks?
var STIMULUSTIME = 500;								// how many ms will the stimulus be shown for in each trial
var BLANKTIME = 2000;								// how long will the blank be shown for
var ITI = [250, 700];									// what is the range of ms between which the blank screen will be shown after each trial?
var CONGRUENTFREQUENCY = 0.25;						// percentage - how frequently should a word appear in it's own color
													// used against the TOTALTRIALS option
var REPETITION_PER_COLOR = 16;			// how many times should a color occur in a block (i.e. YELLOW appearing in YELLOW)
var PRACTICERUN = true;								// will there be a practice? (true/false)
var PRACTICELENGTH = 16;		//16					// how many trials in the practice?
var PRACTICEPASS = 10;							// how many correct answers to move on from practice?
var PRACTICELIMIT = 2;								// how many times can the practice be attempted before participant is moved on?
var PRACTICE_ITI = 500;								// inter-trial interval for practice rounds
var PRACTICEFEEDBACKLENGTH = 3000;		// how long should the post-stim practice feedback slide stay up for?

// ###############
// END OF OPTIONS
// ###############

//##############################
//##############################
//##############################

// Additional setup for tracking test phases and practice score
var RUN_ID = "A"; // "B";
var TRACKED_SLIDE = 0; // for keeping track of when the first block ends and next begins
var PRACTICE_IDS = ["A","B"]; // ["C","D"];
// initialise variables
var PHASE = -1;
var PRACTICEATTEMPTS = 0;
var PRACTICESCORE = 0;
var PRACTICEFAILS = 0;
var CURRENT_BLOCK = 0;

// ##################
// ESTABLISH STYLES DEPENDING ON SCREEN SIZE
// ##################

var FONT_SM, FONT_LG, FONT_STIM;
var fS, fL, fST;
var LINE_SM, LINE_LG;

// ###########
// For creating random IDs for the slides
// ###########
//var uuid = require("uuid");

//################
// Get logging them keystrokes
// once the start button is pressed, of course
//################
var accepted_inputs = ["KeyY", "KeyG", "KeyR", "KeyB", "KeyN", "Space", "Escape"];
var accepted_answers = ["KeyY", "KeyG", "KeyR", "KeyB"];
// What key is associated with what answer?
var answers = {"KeyY":"YELLOW", "KeyG":"GREEN", "KeyR":"RED", "KeyB":"BLUE"};

var lastPressedKey = "none";
function logKey(e){
	// Only need SPACE or ESCAPE for confirmation or exit and R for repeating practice
	// if(e.code == "Space" || e.code == "Escape" || e.code == "KeyR"){
	if(accepted_inputs.includes(e.code)){
		lastPressedKey = e.code;
		//console.log(e.code);
	}
	//console.log(lastPressedKey);
	return lastPressedKey;
}

// Prevent Space from scrolling too
window.addEventListener('keydown', function(e) {
  if(e.keyCode == 32 && e.target == document.body) {
    e.preventDefault();
  }
});

//################
// SART Slide Object Definition
//################
function StroopSlide(canvas, ctx, word, color) {
	// var slideNum = slideID; // track the position at which this slide occurred
	// # ^^ this would be OK, but we can't rely on JS to have things in the right order really
	// assigning the slide an ID after the fact is probably better
	// still, each slide needs to keep record of it's order so we can analyse it in context later, so we need to be able to do that on the fly
	this.id = -1;
	this.assignID = function(aID){
		this.id = aID;
	};
	// id for finding in a shuffled array
	// needed for when have to get this specific slide and remove it after we've used it
	this.creationID = ""+Math.random().toString(36).substr(2, 16)+""+Math.floor(Math.random() * (9999, 1000) - 1000);
	this.milliseconds = 0;
	this.accurateMS = 0;
	this.accurateMSAtStimStart = 0;
	this.counter = 0;
	this.responseTime = -1;
	this.complete = false;	
	// answer is always what the colour is, not the word
	// if it's the same as nonFreq, answer is to do nothing
	this.word = word;
	this.color = color;
	this.correctAnswer = false;
	this.userResponded = false;
	this.userAnswer = "None";
	this.practice = false;

	// set the slide as a practice slide when necessary
	this.setPractice = function(){
		this.practice = true;
		//console.log("Slide "+this.id+" set as practice = "+this.practice);
	}

	// main DOTHETHING function
	this.display = function(){
		// being given the frames that have passed
		// divide by 60 and multiply by 1000 gives us the total millisecond count
		this.milliseconds = (this.counter/60)*1000;

		// clear the screen
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		////console.log(lastPressedKey);
		ctx.textAlign = "center";

		// ######## Start the background timer to track the ms
		if(this.counter == 0){
			//console.time("sart"+this.id);
			this.accurateMS = performance.now();
		}
		// ######## Total time limit between onsets is [STIMULUSTIME] + [BLANKTIME] + [within ITI]ms
		// ######## word shown for [STIMULUSTIME]ms
		// ######## mask for [BLANKTIME]ms
		// ######## finally a blank screen within [ITI]ms (handled elsewhere)
		this.deadline = STIMULUSTIME + BLANKTIME;
		if(this.practice == true){
			// set deadline as 20 seconds
			// they shouldn't be longer than that? And they'll have forgotten anyway
			this.deadline = 20000;
		}

		// run the function as long as the deadline hasn't passed
		if(this.milliseconds < this.deadline){
			// if it's stimulus time, show the stimulus
			if(this.milliseconds < STIMULUSTIME && this.userResponded == false){
				ctx.font = FONT_STIM; //"72pt Arial";
				ctx.fillStyle = this.color;
				ctx.fillText(this.word, canvas.width/2, canvas.height/2);
			}
			else {
				// otherwise, show the mask
				ctx.font = FONT_STIM; //"72pt Arial";
				ctx.fillStyle = "white";
				ctx.beginPath();
				ctx.arc(canvas.width/2, canvas.height/2-(fST/2), fST, 0, 2 * Math.PI);
				ctx.stroke();
				ctx.fillText("X", canvas.width/2, canvas.height/2);
			}
			// wait for an answer to be submitted
			// if the key pressed is in the acceptable answers, move to the next trial
			if(accepted_answers.includes(lastPressedKey)){
				if(this.userResponded == false){
					this.userResponded = true;
					this.userAnswer = answers[lastPressedKey];
					//console.log(this.userAnswer);
					// rt should take into consideration that 187 seconds already passed since the slide started
					//this.responseTime = this.milliseconds - 187;
					//this.responseTime = performance.now() - this.accurateMS - 187;
					this.responseTime = performance.now() - this.accurateMS;
					//if(lastPressedKey == answers[this.color]){
					if(this.userAnswer == this.color){
						this.correctAnswer = true;
					}
					if(this.practice == true){
						this.complete = true;
						return {"complete":this.complete, "word":this.word, "color":this.color, "userAnswer":this.userAnswer, "rt":this.responseTime, "correct":this.correctAnswer};
					}
					// removed these lines to stop the slide from auto-completing on button press
					// needs to rush forward to the fixation cross
					//this.complete = true;
					//return {"complete":this.complete, "word":this.word, "color":this.color, "rt":this.responseTime, "correct":this.correctAnswer};
				}
			}
		}

		// if the deadline is passed
		else {
			if(this.userResponded == false){
				this.responseTime = -1;
			}
			this.complete = true;
			return {"complete":this.complete, "word":this.word, "color":this.color, "userAnswer":this.userAnswer, "rt":this.responseTime, "correct":this.correctAnswer};
		}

		// ######## Show correct/not correct message?
		// just moves on right now

		// ######## Clear the screen
		// count each frame as the display function is run
		this.counter = this.counter + 1;
	};
}

//################
// Show READY before the slides start displaying
//################
function ReadySlide(canvas, ctx){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	this.counter = 0;
	this.milliseconds = 0;
	this.complete = -1;

	this.display = function(){
		this.milliseconds = (this.counter/60)*1000;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.textAlign = "center";
		lastPressedKey = "none";
		////console.log("READY");

		if(this.milliseconds < BLANKTIME){
			ctx.font = FONT_STIM; //"72pt Arial";
			ctx.fillStyle = "white";
			ctx.beginPath();
			ctx.arc(canvas.width/2, canvas.height/2-(fST/2), fST, 0, 2 * Math.PI);
			ctx.stroke();
			ctx.fillText("X", canvas.width/2, canvas.height/2);
		}
		else{
			this.complete = 0;
		}

		// increment counter
		this.counter = this.counter + 1;
		return this.complete;
	};

	this.setIncomplete = function(){
		this.complete = -1;
		this.counter = 0;
		this.milliseconds = 0;
		////console.log("Set complete to " + this.complete)
	};
}

//################
// Show random amount of BLANK after each slide has been displayed
//################
function PostStimBlankSlide(canvas, ctx, practice=false){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	this.counter = 0;
	this.milliseconds = 0;
	this.complete = -1;
	// ######## first we'll create a new ms value for the blank screen, since it changes
	// # max is exclusive here, so we need to add 1 to it to make sure it will use the given maximum
	// if it's the practice round the there's a hard value for inter-trial interval
	if(practice == true){
		this.postStimTime = 500;
	}
	else {
		this.postStimTime = Math.floor(Math.random() * (ITI[1]+1 - ITI[0]) + ITI[0]);
	}


	this.display = function(){
		this.milliseconds = (this.counter/60)*1000;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.textAlign = "center";
		lastPressedKey = "none";

		if(this.milliseconds < this.postStimTime){
			ctx.font = "1pt Arial";
			ctx.fillStyle = "white";
			ctx.fillText("", 0, 0);
		}
		else{
			this.complete = 0;
		}

		// increment counter
		this.counter = this.counter + 1;
		return this.complete;
	};

	this.setIncomplete = function(){
		this.complete = -1;
		this.counter = 0;
		this.milliseconds = 0;
		this.postStimTime = Math.floor(Math.random() * (ITI[1]+1 - ITI[0]) + ITI[0]);

		////console.log("Set complete to " + this.complete)
	};
}

//################
// Break slide for between blocks
//################
function BreakSlide(canvas, ctx, practice=false){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	this.counter = 0;
	this.milliseconds = 0;
	this.complete = -1;
	this.timeout = BLOCKBREAKTIME;
	this.practice = practice;

	this.display = function(){
		this.milliseconds = (this.counter/60)*1000;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.textAlign = "center";
		lastPressedKey = "none";
		////console.log("READY");

		if(this.milliseconds < BLOCKBREAKTIME){
			ctx.fillStyle = "white";
			ctx.font = FONT_LG; //"36pt Arial";
			if(this.practice == true){
				// only happens if they fail the first practice round
				ctx.fillText("You've completed the first practice.", canvas.width/2, canvas.height/2);
				ctx.fillText("Take a moment to have a break.", canvas.width/2, canvas.height/2+60);
				ctx.fillText("Remember - you need to respond with the PRINTED colour of the word.", canvas.width/2, canvas.height/2+120);
				ctx.fillText("The next practice round starts in "+((BLOCKBREAKTIME/1000)-parseInt(this.milliseconds/1000))+" seconds.", canvas.width/2, canvas.height/2+180);
			}	
			else {	
				ctx.fillText("You are halfway through the task.", canvas.width/2, canvas.height/2);
				ctx.fillText("Take a moment to have a break.", canvas.width/2, canvas.height/2+60);
				ctx.fillText("The task will resume in "+((BLOCKBREAKTIME/1000)-parseInt(this.milliseconds/1000))+" seconds.", canvas.width/2, canvas.height/2+120);
			}
		}
		else{
			this.complete = 0;
		}

		// increment counter
		this.counter = this.counter + 1;
		return this.complete;
	};

	this.setIncomplete = function(){
		this.complete = -1;
		this.counter = 0;
		this.milliseconds = 0;
		this.practice = false;
		////console.log("Set complete to " + this.complete)
	};
}

//################
// Feedback Slide for Practice
// Generate one with each practice slide and show it if there's an error?
// Or do what the ready slide does and just have one that gets reset. That's probably better
//################
function FeedbackSlide(canvas, ctx, rt=-1){
	this.counter = 0;
	this.milliseconds = 0;
	this.complete = -1;
	this.response = -1;

	this.setResponse = function(res){
		this.response = res;
		//console.log("Response set as "+this.response);
	};

	this.setRT = function(rtn){
		this.rt = rtn;
	};

	this.display = function(){
		this.milliseconds = (this.counter/60)*1000;
		// maybe run this by Eimer
		if(this.milliseconds < PRACTICEFEEDBACKLENGTH){
			//console.log(this.response);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = "white";
			ctx.textAlign = "center";
			ctx.font = FONT_STIM; //"72pt Arial";
			if(this.response == false){
				ctx.fillText("Wrong", canvas.width/2, canvas.height/2 - 150);
			}
			else {
				if(this.rt >= (parseInt(STIMULUSTIME)+parseInt(BLANKTIME))){
					ctx.fillText("Correct, but try to be faster...", canvas.width/2, canvas.height/2 - 150);
				}
				else{
					ctx.fillText("Good!", canvas.width/2, canvas.height/2 - 150);
				}
			}
			/*else if(this.response == true){
				ctx.fillText("Good!", canvas.width/2, canvas.height/2 - 150);
			}
			else if(this.response == true && this.rt >= (parseInt(STIMULUSTIME)+parseInt(BLANKTIME))){
				ctx.fillText("Correct, but try to be faster...", canvas.width/2, canvas.height/2 - 150);
			}*/
			ctx.fillStyle = "white";
			ctx.font = FONT_LG; //"36pt Arial";			
			ctx.fillText("The test will continue in 3 seconds", canvas.width/2, 560);
			//ctx.fillText("Response time was "+this.rt+", STIMTIME+BLANKTIME is "+(parseInt(STIMULUSTIME)+parseInt(BLANKTIME)), canvas.width/2, 660);
		}
		else{
			this.complete = 0;
		}

		// increment counter
		this.counter = this.counter + 1;
		return this.complete;
	};

	this.setIncomplete = function(){
		this.complete = -1;
		this.counter = 0;
		this.milliseconds = 0;
		this.setResponse(false);
		this.setRT(-1);
		////console.log("Set complete to " + this.complete)
	};

}

//################
// Generate the Slides in a loop for later
//################
function generateStroopSlides(canvas, ctx, taskLength=5, random=true, practice=false){
	// first, there are parameters that need to be met, so we built the whole slide set using those

	// default random=true. If false, should attempt to load a structured file with the ordering in it
	// probably a csv with columns being "word" and "color" with n rows
	// it's decide how long the task will be then too
	// otherwise taskLength will do that
	// colorsWords should be the dict of those things
	//console.log("Practice: "+practice);
	if(random == true){
		// ######## Create {taskLength} sart slide objects
		// create an object with all the relevant conditions
		var condition_set = [];
		var available_conditions = ["YELLOW", "RED", "GREEN", "BLUE"];
		var stroop_slides = [];
		var stroop;

		for (var i = 0; i < REPETITION_PER_COLOR; i++) {
			for(var j = 0; j < available_conditions.length; j++){
				condition_set.push(["YELLOW", available_conditions[j]]);
				condition_set.push(["RED", available_conditions[j]]);
				condition_set.push(["GREEN", available_conditions[j]]);
				condition_set.push(["BLUE", available_conditions[j]]);
				
				/*condition_set["YELLOW"] = available_conditions[j];
				condition_set["RED"] = available_conditions[j];
				condition_set["GREEN"] = available_conditions[j];
				condition_set["BLUE"] = available_conditions[j];*/
			}
		}

		for(var i=0; i<taskLength; i++){
			stroop = new StroopSlide(canvas, ctx, condition_set[i][0], condition_set[i][1]);
			stroop_slides.push(stroop);
		}

		console.log("Generated slides: "+stroop_slides.length);

		// psuedo-random shuffle the array to ensure colors don't show up more than twice in a row
		var last_colors = ["",""]; // create an empty array to check colors against
		var selection; // array for holding relevant choices (ones that don't match previous colors)
		var final_deck = []; // the final output

		// shuffle the array first to make some randomness
		var shuffled = stroop_slides
			.map((a) => ({sort: Math.random(), value: a}))
			.sort((a, b) => a.sort - b.sort)
			.map((a) => a.value);

		// build the final deck with no triplicates

		// build the initial set
		for(var i=taskLength-1; i>=0; i--){
			// create a subarray of slides whose color wasn't used 2 slides ago
			// should guarantee that it will never appear 3 times
			selection = shuffled.filter((x) => { return x.color != last_colors[0]});

			// if we're nearing the end of the set, nothing will match
			// just choose whatever is available at that stage
			if(selection.length == 0){
				entry = shuffled[i];
			}
			// if there is a match, use the first in the array
			// this will already be randomised thanks to the shuffle earlier
			else {
				var entry = selection[0];
			}

			final_deck.push(entry);
			// get rid of the color we just compared to and add the new color for next slide
			last_colors.splice(0,1);
			last_colors.push(entry.color);

			// remove the selected slide from the array using its creationID
			var removeSlide = shuffled.filter((x) => { return x.creationID == entry.creationID });
			shuffled.splice(shuffled.indexOf(removeSlide[0]), 1);

		}

		// check the end of the deck to see if a triplicate occurs
		// if it does, swap the first occurence of that color with the element before it

		// get the last 4 elements
		var deck_end = final_deck.slice(-5);

		// do they equal one another?
		//for(var i=0; i<deck_end.length; i++){

		//}
		if((deck_end[1].color == deck_end[2].color && deck_end[2].color == deck_end[3].color) || (deck_end[2].color == deck_end[3].color && deck_end[3].color == deck_end[4].color)) {
			var swap1 = deck_end[0];
			var swap2 = deck_end[2];
			// splice replaces - can replace both elements at once in one line
			final_deck.splice(final_deck.indexOf(final_deck.filter((x) => { return x.creationID == deck_end[1].creationID })), 2, swap1, swap2);
		}

		// only take a subset if it's a practice
		if(practice == true){
			//console.log("Practice");
			final_deck = final_deck.slice(0,taskLength);
			//console.log("Going to assign practice slides");
			for (var i = 0; i < final_deck.length; i++) {
				//console.log("assigning slide "+i);
				final_deck[i].setPractice();
			}
		}
	}

	//console.log(final_deck);
	//for(var s=0; s<final_deck.length; s++){
	//	console.log("Stroop set final_deck: " + final_deck[s]["color"]);
	//}

	return final_deck;
	
}

//################
// Instructions for introduction. A mess - because of how fillText works
//################
function instructions(canvas, ctx){
	// there has GOT to be a better way of doing this
	// ...... there's not
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = FONT_LG;//"36pt Arial";
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.fillText("STROOP Task Instructions", canvas.width/2, 40);
	ctx.beginPath();
	ctx.moveTo(canvas.width/2 - 600, 60);
	ctx.lineTo(canvas.width/2 + 600, 60);
	ctx.strokeStyle = "white";
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.font = FONT_SM; //"28pt Arial";
	ctx.fillText("In this task you will see colour names", canvas.width/2, 90);
	ctx.fillText("(YELLOW, BLUE, RED, GREEN)", canvas.width/2, 90+LINE_SM);
	ctx.fillText("each printed in a different colour,", canvas.width/2, 90+(LINE_SM*2));
	ctx.fillText("followed by a white cross in the centre of the screen", canvas.width/2, 90+(LINE_SM*3));
	ctx.fillText("Your task is to respond to the print colour of the word.", canvas.width/2, 90+(LINE_SM*4));
	ctx.fillText("So, for example, if you see", canvas.width/2, 90+(LINE_SM*5));
	ctx.fillStyle = "red";
	ctx.fillText("GREEN", canvas.width/2, 90+(LINE_SM*6));
	ctx.fillStyle = "white";
	ctx.fillText("You need to respond with the printed colour, (i.e. red).", canvas.width/2, 90+(LINE_SM*7));
	ctx.fillText("You respond using the keys on your keyboard.", canvas.width/2, 90+(LINE_SM*8));
	ctx.fillStyle = "red";
	ctx.fillText("R (red)", canvas.width/3, 90+(LINE_SM*9));
	ctx.fillStyle = "blue";
	ctx.fillText("B (blue)", (canvas.width/3)*2, 90+(LINE_SM*9));
	ctx.fillStyle = "yellow";
	ctx.fillText("Y (yellow)", canvas.width/3, 90+(LINE_SM*10));
	ctx.fillStyle = "green";
	ctx.fillText("G (green)", (canvas.width/3)*2, 90+(LINE_SM*10));
	ctx.fillStyle = "white";
	ctx.fillText("Try to ignore the meaning of the word, and look at the printed colour", canvas.width/2, 90+(LINE_SM*11));
	ctx.fillText("You can still answer when the white cross is on the screen.", canvas.width/2, 90+(LINE_SM*12));
	ctx.fillText("You will now have a practice round to try this out before completing the task.", canvas.width/2, 90+(LINE_SM*13));
	ctx.fillText("Press the SPACE BAR to begin.", canvas.width/2, 90+(LINE_SM*14));
}

//################
// Run a stroop task (practice or otherwise)
//################

function stroopRun(canvas, ctx, slides, lastS, fbSlide, psbSlide, practice=false) { // loop
	var nextSlide = lastS;
	var results;
	if(nextSlide == slides.length){
		return "complete";
	}

	else if(slides[nextSlide].complete == false){
		slides[nextSlide].assignID(nextSlide+1+TRACKED_SLIDE);
		slides[nextSlide].display();
	}

	else {
		// collect the data first
		if(practice == false){
			// add a on the end of the variable if a second run
			Qualtrics.SurveyEngine.setEmbeddedData("stroop"+RUN_ID+""+(nextSlide+1+TRACKED_SLIDE), "{'rt':"+Math.round(slides[nextSlide].responseTime)+", 'word':'"+slides[nextSlide].word+"', 'color':'"+slides[nextSlide].color+"', 'userAnswer':'"+slides[nextSlide].userAnswer+"', 'correct':"+slides[nextSlide].correctAnswer+"}");
			//console.log("stroop"+(nextSlide+1+TRACKED_SLIDE), "{'rt':"+Math.round(slides[nextSlide].responseTime)+", 'word':'"+slides[nextSlide].word+"', 'color':'"+slides[nextSlide].color+"', 'userAnswer':'"+slides[nextSlide].userAnswer+"', 'correct':"+slides[nextSlide].correctAnswer+"}");
		}
		else {
			results = {rt:Math.round(slides[nextSlide].responseTime), word:slides[nextSlide].word, color:slides[nextSlide].color, correct:slides[nextSlide].correctAnswer, response:slides[nextSlide].userAnswer};
			Qualtrics.SurveyEngine.setEmbeddedData("pracStroop"+PRACTICE_IDS[PRACTICEATTEMPTS]+""+(nextSlide+1+TRACKED_SLIDE), "{'rt':"+Math.round(slides[nextSlide].responseTime)+", 'word':'"+slides[nextSlide].word+"', 'color':'"+slides[nextSlide].color+"', 'userAnswer':'"+slides[nextSlide].userAnswer+"', 'correct':"+slides[nextSlide].correctAnswer+"}");

			// feedback slide if wrong
			//console.log("Practice: stroop"+(nextSlide+1+TRACKED_SLIDE)+ "{'rt':"+Math.round(slides[nextSlide].responseTime)+", 'word':'"+slides[nextSlide].word+"', 'color':'"+slides[nextSlide].color+"', 'userAnswer':'"+slides[nextSlide].userAnswer+"', 'correct':"+slides[nextSlide].correctAnswer+"}");
		}
		// if there was an incorrect answer, give feedback before moving on
		if(practice == true && fbSlide.complete == -1){
			fbSlide.setResponse(slides[nextSlide].correctAnswer);
			fbSlide.setRT(slides[nextSlide].responseTime);
			fbSlide.display();
		}
		else if (practice == true && fbSlide.complete == 0){
			// reset the lastPressedKey variable to prevent accidental answering
			fbSlide.setIncomplete();
			lastPressedKey = "none";
			// set here because the other gives huge scores in a loop
			if(slides[nextSlide].correctAnswer == true){
				PRACTICESCORE = PRACTICESCORE + 1;
			}
			nextSlide = nextSlide + 1;
		}

		if(practice == false && psbSlide.complete == -1){
			psbSlide.display();
		}
		else if(practice == false && psbSlide.complete == 0){
			psbSlide.setIncomplete();
			lastPressedKey = "none";
			nextSlide = nextSlide + 1;
		}
	}
	return nextSlide; // [nextSlide, results];
}

//################
// The main boi for doing the stroop thing
//################
function beginTask(canvas, ctx, slides, pracSlides){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	//console.log("Begin Task");
	
	// phases: [practice, practiceEnd, taskIntro, task, block_end, complete]
	//PHASE = "task";
	var pSlides = pracSlides;
	// create an opening ReadySlide & feedback slide for practice run
	var ready = new ReadySlide(canvas, ctx);
	var fb = new FeedbackSlide(canvas, ctx);
	// create the blank post-stim slide
	var psbs = new PostStimBlankSlide(canvas, ctx);
	// create a break slide for between the blocks
	var br_slide = new BreakSlide(canvas, ctx);
	// and something to keep track of the split point
	var blockend = TOTALTRIALS/NUMBEROFSUBBLOCKS;
	// split the slides into blocks
	var blocks = [];
	for(var t=0; t < TOTALTRIALS; t+=blockend){
		blocks.push(slides.slice(t,t+blockend));
	}
	CURRENT_BLOCK = 0;

	if(PRACTICERUN == true && PHASE != "exit"){
		PHASE = "practice";
		var psbs = new PostStimBlankSlide(canvas, ctx, true);
	}



	// slide counter
	var sc = -1; // originally 0 when not using READY
	var psd = 0; // poststim slide - becomes 0 when finished, starts "finished" so it doesn't run immediately
	var br = -1;
	var pracRes;
	//var practiceAttempts = 0;
	var milliseconds = 0;
	var raf_loop;

	function loop(){ //= window.requestAnimationFrame(function(){
		// ######## Cut it when the user presses space
		if(lastPressedKey=="Escape"){
			//clearInterval(loop);
			window.cancelAnimationFrame(raf_loop);
			//lastPressedKey = "none";
			ctx.font = "16pt Arial";
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillText("The Task has been stopped forcefully.", canvas.width/2, canvas.height - 30);
		}
		else {
			// PHASE 5: Exit message
			if(PHASE == "exit"){
				ctx.font = "21pt Arial";
				ctx.fillStyle = "white";
				ctx.textAlign = "center";
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.fillText("Thank you for completing the task.", canvas.width/2, canvas.height/2-80);
				ctx.fillText("Please continue with the survey by pressing the arrow", canvas.width/2, canvas.height/2 - 30);
				ctx.fillText("at the bottom right hand corner of the screen.", canvas.width/2, canvas.height/2 + 20);
				window.cancelAnimationFrame(raf_loop);
			}

			// PHASE 4: Task completed
			else if(PHASE == "completed"){
				if(document.fullscreenElement){
					if (document.exitFullscreen) {
						document.exitFullscreen();
					} else if (document.webkitExitFullscreen) { /* Safari */
						document.webkitExitFullscreen();
					} else if (document.msExitFullscreen) { /* IE11 */
						document.msExitFullscreen();
					}
				}

				$('NextButton').show();
				
				canvas.width = "740";
				canvas.height = "600";
				PHASE = "exit";
			}

			// PHASE 3.5: block end
			else if(PHASE == "block_end"){
				//console.log("Block end");
				if(br == -1){
					br = br_slide.display();
				}
				else {
					PHASE = "task";
					lastPressedKey = "none";
					ready.setIncomplete();
					psbs.setIncomplete();
					br_slide.setIncomplete();
					sc = -1;
					psd = -1;
					CURRENT_BLOCK += 1;
					TRACKED_SLIDE = TOTALTRIALS/NUMBEROFSUBBLOCKS;
				}
			}
			
			// PHASE 3: Block runs
			else if(PHASE == "task"){
				// run while stroopRun is not completed
				if(sc != "complete"){
					if(sc == -1){
							// display READY
							// will return -1 until completed, then returns 1
							sc = ready.display();
					}
					else {
						// runs while sc == 1 (after ready slide resolves)
						//if(parseInt(CURRENT_BLOCK) < parseInt(NUMBEROFSUBBLOCKS)-1){
						//	sc = sc + TOTALTRIALS/NUMBEROFSUBBLOCKS;
						//}
						sc = stroopRun(canvas, ctx, blocks[CURRENT_BLOCK], sc, fb, psbs);
					}
				}
				else {
					if(parseInt(CURRENT_BLOCK) < parseInt(NUMBEROFSUBBLOCKS)-1){
						// if the current block is done
						// and it's not the last block (NUMBEROFSUBBLOCKS-1 is the index)
						// it's time for the break
						PHASE = "block_end";
						lastPressedKey = "none";
						ready.setIncomplete();
						psbs.setIncomplete();
						sc = -1;
						psd = 0;
					}
					else {
						PHASE = "completed";
						lastPressedKey = "none";
						ready.setIncomplete();
						psbs.setIncomplete();
						sc = -1;
						psd = 0;
					}
				}
			}

			// PHASE 2: Task introduction
			else if(PHASE == "taskIntro"){
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.font = FONT_LG; //"36pt Arial";
				ctx.fillStyle = "white";
				ctx.textAlign = "center";
				ctx.fillText("Main Task Instructions", canvas.width/2, 40);
				ctx.beginPath();
				ctx.moveTo(canvas.width/2 - 600, 60);
				ctx.lineTo(canvas.width/2 + 600, 60);
				ctx.strokeStyle = "white";
				ctx.lineWidth = 3;
				ctx.stroke();
				ctx.font = FONT_SM; //"28pt Arial";
				ctx.fillText("In the main task, again you will see the same", canvas.width/2, 90);
				ctx.fillText("colour name, each printed in a different colour.", canvas.width/2, 90+LINE_SM);
				ctx.fillText("You will NO LONGER RECEIVE FEEDBACK on your answers.", canvas.width/2, 90+(LINE_SM*2));
				ctx.fillText("Your task is to respond to the print colour of the word.", canvas.width/2, 90+(LINE_SM*3));
				ctx.fillText("So, for example, if you see", canvas.width/2, 90+(LINE_SM*4));
				ctx.fillStyle = "red";
				ctx.fillText("GREEN", canvas.width/2, 90+(LINE_SM*5));
				ctx.fillStyle = "white";
				ctx.fillText("You need to respond with the printed colour, (i.e. red).", canvas.width/2, 90+(LINE_SM*6));
				ctx.fillText("You respond using the keys on your keyboard.", canvas.width/2, 90+(LINE_SM*7));
				ctx.fillStyle = "red";
				ctx.fillText("R (red)", canvas.width/3, 90+(LINE_SM*8));
				ctx.fillStyle = "blue";
				ctx.fillText("B (blue)", (canvas.width/3)*2, 90+(LINE_SM*8));
				ctx.fillStyle = "yellow";
				ctx.fillText("Y (yellow)", canvas.width/3, 90+(LINE_SM*9));
				ctx.fillStyle = "green";
				ctx.fillText("G (green)", (canvas.width/3)*2, 90+(LINE_SM*9));
				ctx.fillStyle = "white";
				ctx.fillText("Try to ignore the meaning of the word, and look at the printed colour", canvas.width/2, 90+(LINE_SM*10));
				ctx.fillText("You can still answer when the white cross is on the screen.", canvas.width/2, 90+(LINE_SM*11));
				ctx.fillText("Press the SPACE BAR to begin.", canvas.width/2, 90+(LINE_SM*12));

				if(lastPressedKey=="Space"){
					PHASE = "task";
					lastPressedKey = "none";
					ready.setIncomplete();
					sc = -1;
				}
			}

			// PHASE 1: Practice Ended
			else if(PHASE == "practiceEnd"){
				// repeat option
				// needs to be automatically repeated or scrapped instead of optional and counted
				// 2 failed attempts means they complete the task
				// if score too low on first attempt, go again
				// if score too low on second, end of task
				// if either score is OK, continue to instructions

				br_slide.practice = true;

				// if they have less fails than allowed attempts
				if(PRACTICEFAILS < PRACTICELIMIT){
					// if this attempt was a fail
					if(PRACTICESCORE < PRACTICEPASS){
						if(br == -1){
							br = br_slide.display();
						}
						else {
							// generate new slides and repeat practice
							pSlides = generateStroopSlides(canvas, ctx, taskLength=PRACTICELENGTH, random=true, practice=true);
							PHASE = "practice";
							ready.setIncomplete();
							br_slide.setIncomplete();
							PRACTICESCORE = 0;
							lastPressedKey = "none";
							sc = -1;
							br = -1;
						}
					}
					// if this attempt was a pass
					else {
						// move on
						ready.setIncomplete();
						br_slide.setIncomplete();
						lastPressedKey = "none";
						sc = -1;
						br = -1;
						PHASE = "taskIntro";
					}
				}
				// if they tried the allowed number of times and failed each, they are done
				else {
					PHASE = "completed";
				}
			}

			// PHASE 0: Practice run
			else if(PHASE == "practice"){
				if(sc != "complete"){
					if(sc == -1){
						// display READY
						// will return -1 until completed, then returns 1
						sc = ready.display();
					}
					else if(sc == 0 && psd == -1){
						psd = psbs.display();
					}
					else {
						sc = stroopRun(canvas, ctx, pSlides, sc, fb, psbs, practice=true);
					}
				}
				else {
					PHASE = "practiceEnd";
					PRACTICEATTEMPTS = PRACTICEATTEMPTS + 1;
					if(PRACTICESCORE < PRACTICEPASS){
						PRACTICEFAILS += 1;
					}
					lastPressedKey = "none";
					ready.setIncomplete();
					psbs.setIncomplete();
					sc = -1;
					psd = 0;

				}
			}

			else {
				ctx.font = "16pt Arial";
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.fillText("PHASE is "+PHASE, canvas.width/2, canvas.height - 60);
				ctx.fillText("An issue has occurred. Please refresh the page", canvas.width/2, canvas.height - 30);
			}

			raf_loop = window.requestAnimationFrame(function(){loop();});
		}
	}

	raf_loop = window.requestAnimationFrame(function(){loop();});
}

//################
// First function to be called for setting everything up
//################
function start(setup){
	// ######## Set up -> contains {canvas, context, colors, slides}
	//var setup = stroopSetup();
	// ######## clear the screen and show the instructions
	setup["context"].clearRect(0, 0, setup["canvas"].width, setup["canvas"].height);

	lastPressedKey = "none";

	// show visual test
	// show instructions
	// begin task

	// ######## Start the instructions loop
	var instructInterval = setInterval(function() {
		// ######## Cut it when the user presses space
		if(lastPressedKey=="Space" && PHASE == 0){
			clearInterval(instructInterval);
			lastPressedKey = "none";
			PHASE = 1;
			setup["context"].clearRect(0, 0, setup["canvas"].width, setup["canvas"].height);
			// ######## Start the main ^~@*_stroop-loop_*@~^
			var mainTask = beginTask(setup["canvas"], setup["context"], setup["slides"], setup["practice"]);
		}
		if(PHASE == -1){
			setup["context"].font = FONT_LG; // "30pt Arial";
			setup["context"].fillStyle = "white";
			setup["context"].clearRect(0, 0, setup["canvas"].width, setup["canvas"].height);
			setup["context"].fillText("Before you begin, can you read these words?", setup["canvas"].width/2, 75);
			setup["context"].font = FONT_STIM; //"72pt Arial";
			setup["context"].fillText("YELLOW", setup["canvas"].width/3, setup["canvas"].height/2 - 60);
			setup["context"].fillText("RED", (setup["canvas"].width/3)*2, setup["canvas"].height/2 - 60);
			setup["context"].fillText("GREEN", setup["canvas"].width/3, setup["canvas"].height/2 + 60);
			setup["context"].fillText("BLUE", (setup["canvas"].width/3)*2, setup["canvas"].height/2 + 60);
			setup["context"].font = FONT_LG;
			setup["context"].fillText("YES => Press Y", setup["canvas"].width/3, setup["canvas"].height - 75);
			setup["context"].fillText("NO => Press N", setup["canvas"].width - setup["canvas"].width/3, setup["canvas"].height - 75);

			if(lastPressedKey == "KeyY"){
				setup["context"].clearRect(0, 0, setup["canvas"].width, setup["canvas"].height);
				PHASE = 0;
				lastPressedKey = "none";
			}
			else if(lastPressedKey == "KeyN"){
				// if they can't read the words, they can't continue
				clearInterval(instructInterval);
				lastPressedKey = "none";
				setup["context"].clearRect(0, 0, setup["canvas"].width, setup["canvas"].height);

				if(document.fullscreenElement){
					if (document.exitFullscreen) {
						document.exitFullscreen();
					} else if (document.webkitExitFullscreen) { /* Safari */
						document.webkitExitFullscreen();
					} else if (document.msExitFullscreen) { /* IE11 */
						document.msExitFullscreen();
					}
				}

				$('NextButton').show();
				Qualtrics.SurveyEngine.setEmbeddedData("couldReadWords"+RUN_ID, "No");
				
				setup["canvas"].width = "740";
				setup["canvas"].height = "600";

				setup["context"].font = "21pt Arial";
				setup["context"].fillStyle = "white";
				setup["context"].textAlign = "center";
				setup["context"].clearRect(0, 0, setup["canvas"].width, setup["canvas"].height);
				setup["context"].fillText("Thank you for completing the task.", setup["canvas"].width/2, setup["canvas"].height/2-80);
				setup["context"].fillText("Please continue with the survey by pressing the arrow", setup["canvas"].width/2, setup["canvas"].height/2 - 30);
				setup["context"].fillText("at the bottom right hand corner of the screen.", setup["canvas"].width/2, setup["canvas"].height/2 + 20);
				window.cancelAnimationFrame(raf_loop);

				//PHASE = "completed";
				//var mainTask = beginTask(setup["canvas"], setup["context"], setup["slides"], setup["practice"]);
				// probably have to log this as a response of some kind in Qualtrics
			}
		}
		else if(PHASE == 1){
			setup["context"].clearRect(0, 0, setup["canvas"].width, setup["canvas"].height);
			// ######## Start the main ^~@*_stroop-loop_*@~^
			var mainTask = beginTask(setup["canvas"], setup["context"], setup["slides"], setup["practice"]);
		}
		else {
			instructions(setup["canvas"],setup["context"]);
		}
	}, 1000/60);
	// ######## Wait for start to be selected, the run the sart
	
	// ######## Debrief
}

//################
// NOT YET IMPLEMENTED - Wrapup function for resetting everything
//################
function gracefulReset(){
	alert("Hi");
}

//################
// Initial setup - creates Canvas, variables, stroop_slides, etc
//################
function stroopSetup() {
	// max the window so no weird style anomolies occur
	//window.moveTo(0, 0);
	//window.resizeTo(screen.availWidth, screen.availHeight);
	// Create Canvas
	var canvas = document.createElement("canvas");
	canvas.id = "stroopCanvas";
	canvas.style.border = "1px solid grey";
	canvas.style.backgroundColor = "#222";
	//canvas.width = "700";
	//canvas.height = "600";
	//canvas.width = window.innerWidth; // screen availWidth and availHeight probably better?
	//canvas.height = window.innerHeight;
	canvas.width = screen.availWidth; // screen availWidth and availHeight probably better?
	canvas.height = screen.availHeight;
	//console.log("W: "+canvas.width+", H: "+canvas.height);

	// establish the font sizes
	// 72pt, 36pt, 28pt
	fL = canvas.width/48; // ~35.33 when width=1696
	FONT_LG = fL+"pt Arial";
	LINE_LG = fL*2;
	fS = canvas.width/61;
	LINE_SM = fS*2;
	FONT_SM = fS+"pt Arial";
	fST = canvas.width/23; // ~73.7 when width=1696
	FONT_STIM = fST+"pt Arial";

	// Modify stuff in the Context
	var ctx = canvas.getContext("2d");
	ctx.font = "10pt Arial";
	ctx.fillStyle = "white";
	ctx.textAlign = "center";

	ctx.fillText("Loading STROOP Task...", canvas.width/2, canvas.height - 30);

	// Append the Canvas to the page
	document.body.style.textAlign = "center";
	document.body.appendChild(canvas);

	var practiceSlides = generateStroopSlides(canvas, ctx, taskLength=PRACTICELENGTH, random=true, practice=true); // 5
	var stroop_slides = generateStroopSlides(canvas, ctx, taskLength=TOTALTRIALS); // 10

	return {"canvas":canvas, "context":ctx, "practice":practiceSlides, "slides":stroop_slides};
}

Qualtrics.SurveyEngine.addOnload(function()
{
	this_q = this.getQuestionContainer();
	this_q.innerHTML = "";
	this_q.style.textAlign = "center";
	var startBtn = document.createElement("button");
	startBtn.innerHTML = "Start Task";
	startBtn.onclick = function(){
		var setup = stroopSetup();
		this_q.appendChild(setup["canvas"]);
		this_q.removeChild(startBtn);
		if(setup["canvas"].requestFullScreen){
			setup["canvas"].requestFullScreen();
		}
		else if(setup["canvas"].webkitRequestFullScreen){
	        setup["canvas"].webkitRequestFullScreen();
		}
	    else if(setup["canvas"].mozRequestFullScreen){
	        setup["canvas"].mozRequestFullScreen();
	    }
		start(setup);
	};
	this_q.appendChild(startBtn);
	// onkeyup needs to be set here because otherwise it tracks before the SART even begins and beans's it up
	document.onkeyup = logKey;

});

Qualtrics.SurveyEngine.addOnReady(function()
{
	/*Place your JavaScript here to run when the page is fully displayed*/
	$('NextButton').hide();
});