var user_tags = {};
var user_tag_list = [];
var lastfm;

function show_error(dom, title, message) {
    $(dom).hide().html('<div class="alert alert-error fade in"><a href="#" class="close" data-dismiss="alert">&times;</a><strong>' + title + '</strong> ' + message + '</div>').slideDown(500);
}

function hide_error(dom) {
    $(dom).slideUp(500);
}

function hide_logo() {
    $('.masthead').slideUp(1000);
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

    similarity = total_sum / (a_sum * b_sum);

    console.log(band.artist + ': ' + similarity);

    return similarity;
}


function compare_bands() {
    $('.band-list').slideDown(500);
    $.getJSON('data/bands.json', function(data){
        band_data = data;
        for(var i in band_data) {
            var day = band_data[i].day;
            var bands = band_data[i].bands;
            for(var j in bands) {
                if(!($.isEmptyObject(bands[j].tags))) {
                    var similarity = compare_band(bands[j]);
                    if(similarity < 0.05) {
                        console.log(bands[j].artist_name);
                        $('#' + day).append('<li id="' + bands[j].artist_name + '">'+ bands[j].artist +'</li>')
                    }
                    else {
                        console.log('pish');
                    }
                }
            }
        }
    });
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
                    user_tag_list.push(artist_tags[j].name);
                    if(user_tags[artist_tags[j].name] === undefined) {
                        user_tags[artist_tags[j].name] = +artist_tags[j].count;
                    } else {
                        user_tags[artist_tags[j].name] += +artist_tags[j].count;
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
        period: "12month",
        limit: 25,
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
                console.log(user_tag_list);
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
    $('form').submit(function() {
        /* Create a cache object */
        var cache = new LastFMCache();

        /* Create a LastFM object */
        lastfm = new LastFM({
            apiKey    : api_key,
            apiSecret : api_secret,
            cache     : cache
        });

        var userName = $('#username').val();

        if(userName === "") {
            show_error('#error-msg', 'Ummm...', 'did you forget to enter your last.fm username?');
            $('#controls').addClass('error');
        } else {
            $('#controls').removeClass('error');
            hide_error('#error-msg');
            console.log(userName);

            user = lastfm.user.getInfo({
                user: userName
            },
            {
                success: function(data){
                    hide_logo();
                    getTopArtists(userName);
                    $('.output').slideDown(500);
                },
                error: function(code, message){
                    show_error('#error-msg', 'LastFM Error', ' retrieving user details from Last.FM. They say: \"' + message + '\"');
                }
            });
        }
        return false;
    });
});



