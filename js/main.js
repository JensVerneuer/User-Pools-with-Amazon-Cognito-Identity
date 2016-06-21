var debug = true;
(function(){
	var attributeList = [];
	var isloggedIn = false;
	var isConfirmed = false;
    var tokens;
	var settings = 	{
		mailSignupForm : document.querySelector('form.signup.mail'),
        signoutButtons : document.querySelectorAll('.signoutbutton'),
		confirmForm : document.querySelector('form.signup.confirm'),
        loginForm : document.querySelector('form.signup.login'),
		confirmParameter : "c",
		region : 'us-east-1',
		IdentityPoolData : {
			IdentityPoolId: 'YOUR IDENTETY POOL ID HERE',	
		},
        CognitoUserAttributes : [],
		poolData : {
			Paranoia : 7,
		    UserPoolId : 'YOUR USER POOL ID HERE', // your user pool id here
		    ClientId : 'your client id here' // your client id here
		},
		userData : {}
	}
	var getUrlParams = function getUrlParams(q,s) {
	    s = (s) ? s : window.location.search;
	    var re = new RegExp('&amp;'+q+'=([^&amp;]*)','i');
	    return (s=s.replace(/^\?/,'&amp;').match(re)) ?s=s[1] :s='';
	}

	var logger = function logger(){
		if(!!window.debug){
			if(!!window.console){
				console.log(arguments);
			}
		}
	}
	if(!!window.debug){
		console.log("debug mode enabled");
		AWSCognito.config.logger = logger;	
	}
	// start collecting entropy for not ending up with paranoia level 0 on old browsers - https://github.com/bitwiseshiftleft/sjcl/issues/77
	sjcl.random.startCollectors();
	// pass configs to aws and awscognito sdk
	AWS.config.region = settings.region; 
	AWS.config.credentials = new AWS.CognitoIdentityCredentials(settings.IdentityPoolData);
	AWSCognito.config.region = settings.region; 
    AWSCognito.config.credentials = new AWS.CognitoIdentityCredentials(settings.IdentityPoolData);

    var addCognitoUserAttribute = function CognitoUserAttributes(key, value){
        settings.CognitoUserAttributes.push(
            new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(
                {
                    Name : key,
                    Value : value
                }
            )
        );
    }
	var initEvents = function initEvents(){
    	settings.confirmForm.addEventListener("submit", function submitVerificationCode(e) {
	    	e.preventDefault();
			settings.userData.Username = settings.confirmForm.querySelector('[name=mail]').value;
            settings.userData.confirmationCode = settings.confirmForm.querySelector('[name=verification]').value;            
			settings.userData.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(settings.userData);
			confirmUser();
		})
		settings.mailSignupForm.addEventListener("submit", function submitSignupByEmail(e) {
			e.preventDefault();
            addCognitoUserAttribute('email', settings.mailSignupForm.querySelector('[name=mail]').value)
            signup(settings.mailSignupForm.querySelector('[name=mail]').value, settings.mailSignupForm.querySelector('[name=password]').value);
		});
        
        settings.loginForm.addEventListener("submit", function loginFormSubmit(e) {
            e.preventDefault();
            settings.userData.Username = settings.loginForm.querySelector('[name=username]').value;
            login(settings.loginForm.querySelector('[name=username]').value, settings.loginForm.querySelector('[name=password]').value);
        });
        [].forEach.call(settings.signoutButtons, function(el) {
            el.addEventListener("click", function signout(e) {
                e.preventDefault();
                signOut();
            }, true);
        });
	}
    var login = function login(username, password){
        var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails({Username : username, Password : password});
        settings.userData.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(settings.userData);
        settings.userData.cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                logger(result);
                tokens = result.getAccessToken();
                console.log('access token + ' + result.getAccessToken().getJwtToken());
            },
            onFailure: function(err) {
                alert(err);
            },

        });
        init();
    }    
	var init = function init(){
		isloggedIn = false;
		settings.userData.Pool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(settings.poolData);
		if(!!getUrlParams(settings.confirmParameter) && !isConfirmed){
			settings.confirmForm.querySelector('[name=verification]').value = getUrlParams(settings.confirmParameter);
		}
		if(!!settings.userData.Pool.getCurrentUser()){
            settings.userData.cognitoUser = settings.userData.Pool.getCurrentUser();
	        settings.userData.cognitoUser.getSession(function(err, session) {
	            if (err) {
	                isloggedIn = false;
	            }
                isloggedIn = true;
	            console.log('session validity: ' + session.isValid());
	        });			
		}
		console.log(isloggedIn);
		initEvents();
	}

    var signup = function signup(username, password){
            settings.userData.Pool.signUp(
                username,
                password,
                settings.CognitoUserAttributes,
                null, 
                function(err, result){
                    if (err) {
                        logger(err);
                        return;
                    }
                    settings.userData.cognitoUser = result.user;
                    logger('user name is ' + settings.userData.cognitoUser.getUsername());
                }
            );
        init();
    }
    var signOut = function signOut(){
 		console.log(settings.userData);
    	if(!!settings.userData.cognitoUser){
		    settings.userData.cognitoUser.signOut();

		}
		init();
    }

	var confirmUser = function confirm(){
		settings.userData.cognitoUser.confirmRegistration(settings.userData.confirmationCode, true, function(err, result) {
			if (err) {
				alert(err);
				return;
			}
			isConfirmed = true;
			// initialize again to update status of the user
			init();
			logger('user confirmed');				
			logger('call result: ' + result);
		});	    	
	}
    init();
}())
