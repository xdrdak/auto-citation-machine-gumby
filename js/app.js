
            var app = angular.module('auto-citation-machine', []);
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

            var INTEGER_REGEXP = /^\-?\d*$/;
          
              
           
            var controllers = {};
            Array.prototype.remove = function(from, to) {
              var rest = this.slice((to || from) + 1 || this.length);
              this.length = from < 0 ? this.length + from : from;
              return this.push.apply(this, rest);
            };
            controllers.WorksController = function ($scope, $http, simpleFactory){
                $scope.works = [];
                $scope.selectedWork = {};
                $scope.emptySearch = "";

                init();

                function init(){
                  $scope.selectedWork = simpleFactory.getWork();
                };

                function extractYear(date){
                    var publishedYear = (date!=null?(date).split('-'):'');
                    return publishedYear[0];
                }
                function prettyAuthor(authorsList){
                  var authors = '';
                  $.each(authorsList, function(o, item) {
                    authors += item + (authorsList.length-1==o?'':', ');
                  });
                
                  return authors;
                }
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

                $scope.isBlank = function(str) {
                    return (!str || /^\s*$/.test(str));
                };
                $scope.citeThis = function(index){
                  console.log('selected index = ', index);
                  simpleFactory.postWorks($scope.works[index]);
                 
                }; 
                $scope.deleteAuthor = function(index){
                  ($scope.selectedWork.authorList).remove(index);
                  refreshAuthors();
                };

                function refreshAuthors(){
                    var listSize =  $scope.selectedWork.authorList.length;
                    $.each($scope.selectedWork.authorList, function(index, item) {
                        if(index==0)
                          item.formattedName = item.lastName + ', ' + item.firstName;
                        else
                          item.formattedName = ', '+ item.firstName + ' ' + item.lastName;
                    });
                }
                function refreshAuthors(authorList){
                    var listSize =  authorList.length;
                    $.each(authorList, function(index, item) {
                        if(index==0)
                          item.formattedName = item.lastName + ', ' + item.firstName;
                        else
                          item.formattedName = ', '+ item.firstName + ' ' + item.lastName;
                    });
                }
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
                $scope.addWorks = function() {
                    console.log("Flushing old works and retrieving new list");
                     //Declare our Received Item Array and our scope of the works.

                    $scope.works = [];
                    var ri = [];
                     
                    if(!$scope.isBlank($scope.searchThis))
                    {
                        $scope.emptySearch = "";

                        $http.jsonp( 'https://www.googleapis.com/books/v1/volumes?q='+ $scope.searchThis +'&key=AIzaSyByX-MPOE5C8KU9iXNt-TPVLPzAGSmgkxI&callback=JSON_CALLBACK').
                            success(function(data, status, headers, config) {
                              
                            ri = data.items;

                            if(ri === undefined)
                            {
                               console.log("No works found with that title!");
                               $scope.flashErrorMessage();
                            }
                            else
                            {
                              console.log(ri);
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

                            $("#search-results").fadeIn(200);

                            }

                         
                              
                        }).
                            error(function(data, status, headers, config) {
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

             app.controller(controllers);
