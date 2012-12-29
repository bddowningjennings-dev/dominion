(function(){
    // we'll store all our globals in here
    var randomizer = {};

    var cards;
    var javascript_activated = false;
    var form = document.querySelector("#form form")

    function update_local_cards() {
        /*
        Get all the cards in jquery form, and update the local database
        */
        if (!navigator.onLine) {
            return;
        }
        var req = _.http_request();

        save_cards_locally = function() {
            if (req.readyState === 4) {
                // the response is received. all is well.
                if (req.status === 200) {
                    // perfect!
                    _.debug("recevied cards from server. syncing local database");
                    // put them in local storage
                    localStorage.cards = req.responseText;
                    // also get the cards from local storage, and put them in JSON to use in the app
                    get_local_cards();
                    activate_javascript();
                }
                else {
                    _.debug("problem...." + req.status);
                }
            }
        }

        req.onreadystatechange = save_cards_locally;
        req.open('GET', '/api/expansions');
        req.send(null);
    }

    function get_local_cards() {
        /*
            Take the cards stored in the local database and put them in JSON
            at the global level to use.
        */
        _.debug("loading cards from local database");
        cards = JSON.parse(localStorage.cards);
        return cards;
    }

    function randomize_clicked(e) {
        /*
        Update the page when the form is submitted.
        */
        e.preventDefault();
        update_page();
    }

    function update_page(){
        /*
        Update the page with expansions selected
        */

        // get the names of expansions that are checked
        var expansions = get_expansions();

        // store the expansions in a cookie, so remember on next page load
        set_previously_used_expansions(expansions);

        _.debug(expansions);
        var random_cards = get_random_cards(expansions);
        put_in_dom(random_cards);
        window.location.hash = "randomize";
        document.querySelector("#randomize").scrollIntoView();
    }

    function put_in_dom(cards) {
        /*
        Put the results of randomization into the DOM
        */
        var i;
        dom_string = "";
        for (expansion in cards) {
            dom_string += "<div id=\"" + expansion + "\" class=\"expansion\">";
            dom_string += "<h1>" + expansion + "</h1>";
            dom_string += "<ul>";
            var i;
            for (i = 0; i < cards[expansion].length; i++) {
                dom_string += "<li>" + cards[expansion][i].name + "</li>";
            }
            dom_string += "</ul>";
            dom_string += "</div>";
        }

        var cards_html = document.querySelector("#cards");
        if (cards_html){
            cards_html.innerHTML = dom_string;
        }
    }

    function set_previously_used_expansions() {
        var cookie_string = get_expansions().join(" ");
        _.set_cookie("expansions", cookie_string);
    }

    function select_previously_used_expansions() {
        var cookie_string;
        if (cookie_string = _.get_cookie("expansions")) {
            var previous_expansions = cookie_string.split(" ");
            select_expansions(previous_expansions);
        }
    }

    function select_expansions(expansions) {
        var all_expansions = document.querySelectorAll("input[name='expansion']");
        for (var j = 0; j < all_expansions.length; j++ ) {
            all_expansions[j].checked = false;
        }
        for (var j = 0; j < all_expansions.length; j++ ) {
            for (var i = 0; i < expansions.length; i++) {
                if (expansions[i] === all_expansions[j].value) {
                    all_expansions[j].checked = true;
                }
            }
        }

    }

    function get_expansions() {
        /*
        Given the DOM form, returns a list of checked expansion names.
        */
        var checkboxes = form.elements.namedItem("expansion");
        _.debug(checkboxes);
        var expansions = [];
        for(var i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked) {
                expansions.push(checkboxes[i].value);
            }
        }
        return expansions;
    }

    function get_random_cards(expansions){
        /*
        Given a list of expansion names, return a dictionary with those expansion
        names as keys, and lists of cards as the values.

        e.g.
        input{ ["Prosperity", "Intrigue"]
        output{ {
                    "Prosperity"{ [card1, card2, card3, card4],
                    "Intrigue"{ [card5, card6, card7, card8, card9, card10]
                }
        */

        var expansions = validate_expansions(expansions);
        if (expansions.length < 1){
            return false;
        }

        // get a random number of cards for each expansion
        var ran = constrained_random(expansions.length, 10);
        var random_cards = {};
        var i;
        for (i = 0; i < expansions.length; i++){
            // don't do anything if there are no cards to be delt
            if (!ran[i]){
                continue;
            }

            expansion = expansions[i];

            // shuffle the expansion, then pick the top n cards, where n is the number
            // of cards we randomly selected from this expansion
            cards[expansion].sort( function() { return 0.5 - Math.random() } );
            random_cards[expansion] = cards[expansion].slice(0,ran[i]);

            // if the cards are from prosperity, select 
            // whether or not playing with Colony and Platinum
            if (expansion === "Prosperity" && rand_int(1,10) <= ran[i]) {
                random_cards[expansion].push({name:"Use Platinum and Colony"});
            }

            // if the cards are from dark ages, select 
            // whether or not playing with shelters
            if (expansion === "Dark Ages" && rand_int(1,10) <= ran[i]) {
                random_cards[expansion].push({name:"Start with shelters"});
            }
        }

        return random_cards
    }

    function validate_expansions(expansions){
        /*
        Given a list of expansion names, return a list of expansion names
        with all invalid expansion names removed.
        
        e.g.
        input: ["Prosperity", "Intrigue", "Poop"]
        output: ["Prosperity", "Intrigue"]

        input: "alksjdflkajs"
        output: []
        */
        var i;
        var valid_expansions = [];
        for (i = 0; i < expansions.length; i++) {
            if(expansions[i] in cards) {
                valid_expansions.push(expansions[i]);
            };
        }
        return valid_expansions;
    }


    function constrained_random(n, total){
        /* Return a randomly chosen list of n positive integers summing to total.
        Each such list is equally likely to occur. */
        var i;
        var dividers = [0, total];
        for (i = 1; i < n; i++){
            dividers.push(rand_int(0, total));
        }
        dividers.sort(compare_numbers);
        
        _.debug(dividers);

        var intervals = [];

        for (i = 0; i < dividers.length - 1; i++) {
            intervals.push(Math.abs(dividers[i] - dividers[i + 1]));
        }

        return intervals;
    }


    function rand_int(min, max) {
        // return an int from min to max inclusive
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function compare_numbers(a,b) {
      return a - b;
    }

    function activate_javascript() {
        /*
            If it hasn't been activated already, attach the event listener to the
            form to activate client-side randomization
        */
        if (javascript_activated) {
            return;
        }
        form.addEventListener("submit", randomize_clicked);
        javascript_activated = true;
    }

    function init() {
        // load the cards from the server-side database (async)
        update_local_cards();
        select_previously_used_expansions();

        // if there are already cards in the local database,
        // load them into the app and activate js randomization
        if (localStorage.cards) {
            get_local_cards();
            activate_javascript();
            if (_.get_cookie("expansions")){
                update_page();
            }
            _.debug(cards);
        }
    }

    randomizer.init = init;
    randomizer.set_cookie = set_previously_used_expansions;
    randomizer.get_cookie = select_previously_used_expansions;
    randomizer.sync_db = update_local_cards;
    randomizer.expansions = function() {
        if (cards) {
            return cards;
        }
        if (cards = get_local_cards()) {
            return cards;
        }
        update_local_cards();
        return false;
    }
    window.randomizer = randomizer;
})()
