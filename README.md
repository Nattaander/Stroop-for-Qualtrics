# Stroop-for-Qualtrics
 A pure JS implementation of the Stroop task designed to work embedded in a [Qualtrics](https://www.qualtrics.com/) survey and to be distributed online.

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

There are only really 3 sections of the codebase making it Qualtrics-specific:
- Line 611: `Qualtrics.SurveyEngine.setEmbeddedData( ... );`

- Line 616: `Qualtrics.SurveyEngine.setEmbeddedData( ... );`

- Lines 1108 - 1112:
`
Qualtrics.SurveyEngine.addOnReady(function()
{
	/*Place your JavaScript here to run when the page is fully displayed*/
	$('NextButton').hide();
});
`

## Making this platform-independant
There is no reason why this won't work independant of Qualtrics provided you have somewhere to host the code and can replace the Qualtrics embedded data storage with calls to a database of some kind.

> [!TIP]
> For quick-and-dirty independance:
> - Remove lines 1108 - 1112 completely. They only hide the "Next" button in Qualtrics.
> - Replace the calls in lines 611 and 616 with calls to your own database.

## Non-exhaustive non-commital list of possible todos
- Create an independant implementation running in a HTML page
- Separate the options from the top of the code into embedded variables in Qualtrics that can be modified by an end-user