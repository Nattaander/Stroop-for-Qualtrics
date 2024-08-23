# Stroop-for-Qualtrics
 A pure JS implementation of the Stroop task designed to work embedded in a [Qualtrics](https://www.qualtrics.com/) survey and to be distributed online.

> [!WARNING]
> This implementation assumes access to the *paid* Qualtrics API

## Design Goals
 This codebase is not intended to be a flexible framework for building Stroop tasks from the core up, rather it is designed as a *plug-in, configure and play* system needing minimal intervention.

 The conceptual design of the codebase is to generate a "slide deck" based on the configuration, separate the slides into as many blocks as necessary ensuring each block meets the criteria on the config, then shuffle the blocks and present them.

 The primary reasons I built this are:
 1. To create an accessible, open-source, online version of the Stroop for students and researchers of Applied Psychology to use as part of studies which
 2. Easily slots into their existing system of choice for surveys (Qualtrics) and can be easily unpacked with a script and
 3. To *very deliberately* bury the notion that we need E-Prime to do this kind of thing

## Features
- Fully-functional start-to-finish Stroop task
- Highly configurable
- Uses `performance.now()` for reliable and accurate millisecond tracking of inputs
- Built-in instructions
- Precautionary participant sight check
- Practice round option with per-trial feedback
- Uses HTML canvas & pure JS - no dependencies!
- Occasional swearing in the comments that I haven't found to remove!

## Quickstart
 1. Create a new text/graphic question in your Qualtrics survey
 2. Click the Javascript icon in the left-hand Edit Question panel
 3. Copy the contents of the `main.js` file and paste into the Javascript window
 4. Save
 5. Preview your survey, and you should have a button that says "Start Task". Click this to run the Stroop with default configuration

 Once you've run through the task, you can export your data from Qualtrics as a CSV file (using their normal process). Rename that CSV file to `stroop.csv` and place it in the same folder as the `unpack_stroop_results.py`. Run `unpack_stroop_results.py` to receive an extrapolated dataset of pure Stroop data in csv format.

## Configuration
| DESCRIPTION  | VARIABLE NAME | DATATYPE | DEFAULT VALUE |
| ------------- | ------------- | ------------- | ------------- |
| Total number of trials | TOTALTRIALS | INT | 128 |
| Number of blocks to split the trial into | INT | NUMBEROFSUBBLOCKS | 2 |
| Break time between blocks in ms | BLOCKBREAKTIME | INT | 10000 |
| Blank screen time between practice trials in ms | PRACTICE_ITI | INT | 500 |
| Practice feedback slide presentation time in ms | PRACTICEFEEDBACKLENGTH | INT | 3000 |
| Display time for the stimulus in ms | STIMULUSTIME | INT | 500 |
| Display time for the popst-stimulus "blank" in ms | BLANKTIME | INT | 2000 |
| Range between which an empty screen appears after a trial | ITI | ARRAY(2) | [250,700] |
| Frequency with which a word appears in it's own color | CONGRUENTFREQUENCY | FLOAT | 0.25 |
| Amount of times a color should occur in a block | REPETITION_PER_COLOR | INT | 16 |
| Will there be a practice run? | PRACTICERUN | BOOL | true |
| How many practice trials? | PRACTICELENGTH | INT | 16 |
| How many correct answers to move past practice? | PRACTICEPASS | INT | 10 |
| How many attempts at practice? | PRACTICELIMIT | INT | 2 |

## Qualtrics-specific Implementation
> [!WARNING]
> This implementation assumes access to the *paid* Qualtrics API

This implementation relies on Qualtrics for a number of simple reasons:
- End-user familiarity with the core product
- University buy-in for the product
- Online delivery with the facility to embed directly into an existing survey, allowing for a whole study to be presented in a single location
- Facility to store the Stroop data directly alongside all the other participant data using Embedded Data fields while adhering to GDPR

This implementation uses the `Qualtrics.SurveyEngine.setEmbeddedData` method from the Qualtrics API to create new embedded data inside the Qualtrics survey. While this method is available in Qualtrics instances that do not pay for the premium API, the paid version is the only one which allows you to create *new* embedded data.

It is still possible to use this implementation without the paid API, *however* it does require you to ***manually enter each and every one of the embedded data variables into the survey flow***. I did this in an earlier iteration. Would not recommend.

There is also no reason why this won't work independant of Qualtrics provided you have somewhere to host the code and can replace the Qualtrics embedded data storage with calls to a database of some kind.

There are only a handful of thing in the codebase making it Qualtrics-specific:
- Line 617: `Qualtrics.SurveyEngine.setEmbeddedData( ... );`
- Line 622: `Qualtrics.SurveyEngine.setEmbeddedData( ... );`
- Lines 1114 - 1118: `Qualtrics.SurveyEngine.addOnReady(function(){ ... });`
- Lines 1086 - 1112: `Qualtrics.SurveyEngine.addOnload(function(){this_q = this.getQuestionContainer();...});`

> [!TIP]
> For quick-and-dirty independance:
> - Remove lines 1114 - 1118 completely. They only hide the "Next" button in Qualtrics.
> - Replace the calls in lines 611 and 616 with calls to your own database.
> - Lines 1086 - 1112 clear the Qualtrics Question container and replace it with a start button - replace with whatever triggers the beginning of the test for you (e.g. a html button)

## Non-exhaustive, non-commital list of possible todos
- Create an independant implementation running in a HTML page
- Separate the options from the top of the code into embedded data variables in Qualtrics that can be modified by an end-user
- Add additional config options for button text, feedback messages, instructions text, post-trial practice feedback timing, etc
- A Readthedocs.io page to explain the methods
- Refactor the unpacking script & make it presentable - maybe turn into a standalone exe which unpacks the data without the need for the user to have python installed
- Consider an evaluation and publication to make it solidly "research quality"