//Gumby related stuff, don't (want to) touch.
// Gumby is ready to go
Gumby.ready(function() {
    console.log('Gumby is ready to go...', Gumby.debug());

    // placeholder polyfil
    if(Gumby.isOldie || Gumby.$dom.find('html').hasClass('ie9')) {
        $('input, textarea').placeholder();
    }
});

// Oldie document loaded
Gumby.oldie(function() {
    console.log("This is an oldie browser...");
});

// Touch devices loaded
Gumby.touch(function() {
    console.log("This is a touch enabled device...");
});

// Document ready
$(function() {
});

//Helper function to splice an array.
Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

///////////////////////////////////////////////////
//ALRIGHT MAYTEES. ANGULAR RELATED STUFF DOWN BELOW.
///////////////////////////////////////////////////
/*

	##TODO##
	- Fix sketchy author list logic (serious, that thing is wack)
	- Actual error check when things go wrong when communicating with the Google Books API
	- More error messages (because, BOOK NOT FOUND, isn't the only possible error)
	- Adding more citation styles.
	- Easier Author manipulation (I mean, it works. But if you made a typo, you have delete it. Pretty extreme.)

*/

//Declare our new Anguar Application. We will target the auto-citation-machine tag
var app = angular.module('auto-citation-machine', []);

//Configuring the routes of our application
//We inject a dependancy to $routeProvider to change the routes of our application.
//Self explanatory.
app.config(function ($routeProvider){
    $routeProvider
    .when('/search',
    {
        controller: 'WorksController',
        templateUrl: 'views/search.html'
    })
    .when('/citation',{
        controller: 'WorksController',
        templateUrl: 'views/citation.html'
    })
    .otherwise({redirectTo: '/search' });

});

//Our factory for the application.
//In this current situation, there's only one.
//It's meant to keep information from one page to another.
app.factory('simpleFactory', function(){
    var work = {
        title: '',
        authorsConcatenated: '',
        authorList:  [],
        publisher:  '',
        publisherCity: '',
        publishedDate:  '',
        subtitle:  '',
        isbn_10: '',
        fullTitle:  ''
    }
    var factory = {};
    factory.getWork = function(){
        return work;
    };
    factory.postWorks = function(w){
        work = w;
    };

    return factory;
});

//Declare a controller object. We will store all controllers in here and pass it to our
//Angular application
var controllers = {};

//Declare our first (and perhaps only) controller
//We do independancy injection of our $scope, $http (used for that API call to google) and 
//simpleFactory (used in conserving information fromone page to another).
controllers.WorksController = function ($scope, $http, simpleFactory){

	//Declare our variables that should be available globally.
    $scope.works = []; //All of the works that have been found are stored here. Raw format
    $scope.selectedWork = {}; //The work we are currently manipulating/selecting

    init(); //First and mandatory call to the app.

    //With the factory that has been injected, we attempt to retrieve our selected work.
    //When the user selects something, we store it in the factory and retrieve it later.
    function init(){
        $scope.selectedWork = simpleFactory.getWork();
    };

	//Little helper function that should only be available in this controller
    function extractYear(date){
        var publishedYear = (date!=null?(date).split('-'):'');
        return publishedYear[0];
    }

    //Helper function that returns a neatly formatted list of authors in for of a string.
    //Used to present the authors of a book.
    function prettyAuthor(authorsList){
        var authors = '';
        $.each(authorsList, function(o, item) {
            authors += item + (authorsList.length-1==o?'':', ');
        });

        return authors;
    }

    //Since the author list is somewhat more than just a name (it can be first name, middle name, last name and so forth...)
    //We create a list of authors that will be stored in the work.
    //createAuthorList retrieves a string of authors and converts everything to an array for easier manipulation.
  	//Formatted name is left blank. It's an eventual placeholder when we need to dynamically change the way we display the author.
    function createAuthorList(authors){
        var authorList = [];
        if(!$scope.isBlank(authors)){
            $.each(authors, function(o, item) {
                var components = item.split(' ');
                authorList.push({
                    firstName : components.shift(),
                    lastName : components.join(''),
                    formattedName : ''
                }); 
            });
        }
        refreshAuthors(authorList);
        return authorList;

    };

    //Helper function to determine if a string is empty
    $scope.isBlank = function(str) {
        return (!str || /^\s*$/.test(str));
    };

    //Action for our "Cite This!" button.
    //We store the desired work (based on index position) into postwork, which is then stored in the factory to be
    //retrieved at a later time.
    $scope.citeThis = function(index){
        console.log('selected index = ', index);
        simpleFactory.postWorks($scope.works[index]);

    }; 

    //Action for our "X" button.
    //It's to delete an author from a work.
    $scope.deleteAuthor = function(index){
        ($scope.selectedWork.authorList).remove(index);
        refreshAuthors();
    };

	//Whenever we manipulate a list of authors, we have to refresh the list, as well as change the way the names are formatted.
    function refreshAuthors(authorList){
        var aList = null;
        var listSize = 0; 
        if(authorList === undefined)
            aList = $scope.selectedWork.authorList;
        else
            aList =  authorList;

        $.each(aList, function(index, item) {
            if(index==0)
                item.formattedName = item.lastName + ', ' + item.firstName;
            else
                item.formattedName = ', '+ item.firstName + ' ' + item.lastName;
        });
    }

    //Action for the "Add" button.
    //Simple push into our authorList, followed by clearing the user text entry.
    $scope.addAuthor = function(){
        refreshAuthors();
        var listSize =  $scope.selectedWork.authorList.length;
        $scope.selectedWork.authorList.push(
        {
            firstName: $scope.authorFirstName, 
            lastName: $scope.authorLastName, 
            formattedName: (listSize !=0? " and " + $scope.authorFirstName + ' '+ $scope.authorLastName : $scope.authorLastName + ' '+ $scope.authorFirstName )
        }
    );
        $scope.authorFirstName = '';
        $scope.authorLastName = '';
    }
    $scope.flashErrorMessage = function(){
        $("#error-msg").toggle(500).delay(1000).toggle(500);

    };

    //Action for the "Citation Ho!" Button
    //We attempt to retrieve various works from google books api from the user text entry.
    //If it's successful, we populate our works array.
    $scope.addWorks = function() {
        console.log("Flushing old works and retrieving new list");
        //Declare our scope of the works and our R(eceived) I(tem) Array.
        $scope.works = [];
        var ri = [];

		//In order to prevent spamming the google api with blank texts, let's just throw an error to the user.
        if(!$scope.isBlank($scope.searchThis)) 
        {
        	//We use the previously injectected $http dependency and attempt to retreive information from the google API.
        	//JSONP is used, simply because in the development environment, I had security warnings.
        	//The only real change is that JSONP expects a callback from the server. It's to prevent any cross-site exploits.
        	//TODO : an actual error message when thing goes wrong while communicating with the Google Books API.
            $http.jsonp( 'https://www.googleapis.com/books/v1/volumes?q='+ $scope.searchThis +'&key=AIzaSyByX-MPOE5C8KU9iXNt-TPVLPzAGSmgkxI&callback=JSON_CALLBACK').
                success(function(data, status, headers, config) {
                ri = data.items;

                //If absolutely nothing was found, throw an error.
                if(ri === undefined)
                {
                    console.log("No works found with that title!");
                    $scope.flashErrorMessage();
                }
                else
                {
                    console.log(ri);
           			//populating our Works[] array and preventing common problems (dat undefined).
                    $.each(ri, function(i, item) {
                        var subtitle = (ri[i].volumeInfo.subtitle!==undefined?ri[i].volumeInfo.subtitle:' ');
                        $scope.works.push({
                            title: ri[i].volumeInfo.title,
                            authorsConcatenated:  (ri[i].volumeInfo.authors!==undefined?prettyAuthor(ri[i].volumeInfo.authors):''),
                            authorList: createAuthorList(ri[i].volumeInfo.authors),
                            publisher: ri[i].volumeInfo.publisher,
                            publisherCity: '',
                            publishedDate: extractYear(ri[i].volumeInfo.publishedDate),
                            subtitle:  subtitle,
                            isbn_10: (ri[i].volumeInfo.industryIdentifiers!==undefined?ri[i].volumeInfo.industryIdentifiers[0].identifier:''),
                            fullTitle:  ri[i].volumeInfo.title +  ((subtitle).length!=0 ? subtitle : '')
                        });
                    });

                    console.log($scope.works);

                    //Since the search results are automatically posted (due to Angular voodoo), we have to show the results that were previously hidden
                    $("#search-results").fadeIn(200);

                }

            })
            .error(function(data, status, headers, config) {
            	$scope.flashErrorMessage();
                console.log(data);
            });


        }
        else
        {   
            $scope.flashErrorMessage();
            console.log("empty");
        }  
    };

};

//Add our controllers to the application
app.controller(controllers);