var user_tags = {};
var band_data = undefined;
var lastfm = undefined;

function show_error(dom, title, message) {
    $(dom).hide().html('<div class="alert alert-error fade in"><a href="#" class="close" data-dismiss="alert">&times;</a><strong>' + title + '</strong> ' + message + '</div>').slideDown(500);
}

function hide_error(dom) {
    $(dom).slideUp(500);
}

function do_transition() {
    $('.masthead').slideUp(500);
    $('.output').slideDown(500);
    $('#similarity-form').slideDown(500);
}

function progress(message) {
    $('.output p').prepend(message + '<br />');
}

function compare_band(band) {
    var band_tags = band.tags;

    var similarity = 0;

    var a_sum  = 0;
    var b_sum = 0;
    var total_sum = 0;

    for (var i in band_tags) {
        if(user_tags[i] !== undefined) {
            a_sum += +user_tags[i];
            b_sum += +band_tags[i];
            total_sum += +user_tags[i] * +band_tags[i];
        }
    }

    if(a_sum === 0 || b_sum === 0) {
        similarity = 1;
    } else {
        similarity = total_sum / (a_sum * b_sum);
    }

    return similarity;
}

function load_band_data() {
    band_data = band_data;
    return $.getJSON('data/bands.json', function(data) {
        band_data = data;
    });
}


function compare_bands() {
    var max = 0;
    for(var j in user_tags) {
        if(user_tags[j] > max) {
            max = user_tags[j];
        }
    }
    for(var j in user_tags) {
        user_tags[j] /= max;
    }
    for(var i in band_data) {
        var day = band_data[i].day;
        var bands = band_data[i].bands;
        for(var j in bands) {
            var similarity = compare_band(bands[j]);
            $('#' + day).append('<li id="' + bands[j].artist_name + '">'+ bands[j].artist +'</li>');
            $('#' + bands[j].artist_name).data('data-similarity', similarity);
        }
    }
    $('.band-list').slideDown(500);
    do_comparison();
}

function log100(val) {
    return Math.log(val) / Math.log(100);
}

function do_comparison(){
    var req_similarity = +$('#similarity').val();
    req_similarity = 1.0-log100(req_similarity);

    for(var i in band_data) {
        var day = band_data[i].day;
        var bands = band_data[i].bands;
        for(var j in bands) {
            var similarity = +$('#' + bands[j].artist_name).data('data-similarity');
            if(similarity <= req_similarity) {
                $('#' + bands[j].artist_name).slideDown(200);
            } else {
                $('#' + bands[j].artist_name).slideUp(200);
            }
        }
    }
}

function getArtistTags(artist) {
    return $.Deferred(function(dfd) {
         lastfm.artist.getTopTags({
            artist: artist,
            autocorrect: 1
        },
        {
            success: function(data) {
                progress("retrieved tags for: " + artist);
                var artist_tags = data.toptags.tag;
                for(var j in artist_tags) {
                    if(user_tags[artist_tags[j].name] === undefined) {
                        user_tags[artist_tags[j].name] = +artist_tags[j].count;
                    } else {
                        user_tags[artist_tags[j].name] += +artist_tags[j].count;
                        user_tags[artist_tags[j].name] /= 2;
                    }
                }
                dfd.resolve();
            },
            error: function(code, message) {
                progress('retrieving tags for artist \"' + artist_data[i].name + '\" failed: ' + message);
                dfd.resolve();
            }
        });
    });
}

function getTopArtists(user) {
    progress('retrieving top 100 artists for the last year...');
    var complete = 0;
    var artists = lastfm.user.getTopArtists({
        user: user,
        period: "6month",
        limit: 100,
    },
    {
        success: function(data){
            progress('top 100 artists for the last year retrieved...');
            var artist_data = data.topartists.artist;
            progress('retrieving tags for artists...');
            var artist_tags = [];
            for(var i in artist_data) {
                artist_tags.push(getArtistTags(artist_data[i].name));
            }
            $.when.apply(null, artist_tags).done(function() {
                compare_bands();
                progress('top tags for artists retrieved...');
                progress('building user tag profile...');
            });
        },
        error: function(code, message){
            show_error('#error-msg', 'LastFM Error', ' retrieving artist data from Last.FM. They say: \"' + message + '\"');
        }
    });
}

$(function() {
    var $el = $('#similarity');
    $el.data('oldVal', $el.val());

    $el.change(function() {
        var $this = $(this);
        var newValue = $this.data('newVal', $this.val());
        if(newValue !== $(this).data('oldVal')) {
            do_comparison();
        }
    }).focus(function(){
        // Get the value when input gains focus
        var oldValue = $(this).data('oldVal');
    });


    $('form').submit(function() {


        // reset the page
        $('.band-list').slideUp(500);
        $('#thurs').html('');
        $('#fri').html('');
        $('#sat').html('');
        $('#sun').html('');

        // Create a cache object
        var cache = new LastFMCache();

        // Create a LastFM object
        lastfm = new LastFM({
            apiKey    : api_key,
            apiSecret : api_secret,
            cache     : cache
        });

        // load the local band data for SWNFest
        load_band_data();

        // get the username from the input field
        var userName = $('#username').val();

        // check we have a username, if so, retrieve details from Last.FM to check it's a valid user, otherwise display error
        if(userName === "") {
            show_error('#error-msg', 'Ummm...', 'did you forget to enter your last.fm username?');
            $('#controls').addClass('error');
        } else {
            // get rid of any error applied
            $('#controls').removeClass('error');
            hide_error('#error-msg');
            // move page to be ready to show list
            do_transition();
            user = lastfm.user.getInfo({
                user: userName
            },
            {
                success: function(data){
                    getTopArtists(userName);
                },
                error: function(code, message){
                    show_error('#error-msg', 'LastFM Error', ' retrieving user details from Last.FM. They say: \"' + message + '\"');
                }
            });
        }
        return false;
    });
});



