

(function () {
    // file drag hover
    function FileDragHover(e) {
        e.stopPropagation();
        e.preventDefault();
        e.target.className = (e.type == "dragover" ? "hover" : "filedrag");
    }

    // file selection
    function FileSelectHandler(e) {
        FileDragHover(e); // cancel event and hover styling
        var file = (e.type == "change" ? e.target.files[0] : e.dataTransfer.files[0]);
        if (this.id.substr((e.type == "change" ? 10 : 8), 5) == "video") {
            $('#filedragvideo').text('Video : ' + file.name);

            var video = document.getElementById('video');
            //var source = document.createElement('source');
            var source = document.getElementById('source');

            source.setAttribute('src', file.path);
           // video.appendChild(source);
            video.load();

        } else {
            var idsubtitle = this.id.substr((e.type == "change" ? 10 : 8), 1);
            $('#filedrag' + idsubtitle).text('Subtitle ' + idsubtitle + ': ' + file.name);
            showPreloader();
            var reader = new FileReader();
            reader.onload = function (e) {

                var lines = this.result.split('\n');

                var sqlite3 = require('sqlite3'); //.verbose();
                var db = new sqlite3.Database('data.db');
                db.run("DELETE FROM SUBTITLE WHERE N_SUB_ID=" + idsubtitle, function () {
                    console.log("DELETE FROM SUBTITLE");
                    db.run("begin transaction", function () {
                        console.log("begin transaction");
                    });
                    for (var line = 0; line < lines.length; line++) {
                        if (RegExp("\\d+").test(lines[line])) {
                            var N_NUM_COUNT = Number(lines[line]).valueOf();
                            line++;
                            if (line < lines.length) {
                                if (RegExp("\\d\\d:\\d\\d:\\d\\d,\\d\\d\\d --> \\d\\d:\\d\\d:\\d\\d,\\d\\d\\d").test(lines[line])) {
                                    var D_START_TIME = Number((lines[line]).substring(0, 2)).valueOf() * 60 * 60;
                                    D_START_TIME += Number((lines[line]).substring(3, 5)).valueOf() * 60;
                                    D_START_TIME += Number((lines[line]).substring(6, 8)).valueOf();
                                    D_START_TIME += Number((lines[line]).substring(9, 12)).valueOf() / 1000;
                                    var D_END_TIME = Number((lines[line]).substring(17, 19)).valueOf() * 60 * 60;
                                    D_END_TIME += Number((lines[line]).substring(20, 22)).valueOf() * 60;
                                    D_END_TIME += Number((lines[line]).substring(23, 25)).valueOf();
                                    D_END_TIME += Number((lines[line]).substring(26, 29)).valueOf() / 1000;
                                    var S_SUB_TEXT = "";
                                    line++;
                                    while ((line < lines.length) && (lines[line]).trim() != "" /*!= null && (lines[line] != "")*/) {
                                        S_SUB_TEXT += S_SUB_TEXT == "" ? lines[line] : " " + lines[line];
                                        line++;
                                    }
                                    //S_SUB_TEXT = S_SUB_TEXT.replaceAll("</\\w*>|<\\w*>", "");
                                    db.run("INSERT INTO SUBTITLE (N_NUM_COUNT, D_START_TIME, D_END_TIME, S_SUB_TEXT, N_SUB_ID) VALUES (?,?,?,?,?)", [N_NUM_COUNT, D_START_TIME, D_END_TIME, S_SUB_TEXT, idsubtitle]);
                                    //console.log(N_NUM_COUNT + " " + D_START_TIME + " " + D_END_TIME + " " + S_SUB_TEXT);
                                }
                            }
                        }
                    }
                    db.run("commit", function () {
                        console.log("commit");
                    });
                });
                db.close(function () {
                    hidePreloader();
                    console.log("close");
                    getData(w2ui['grid']);
                });
            }
            reader.readAsText(file);
        }
    }

    function OpenFileOption() {
        document.getElementById("fileselect" + this.id.substr(8, 5)).click();
    }

    function Init($fileselectid, $filedragid) {

        var fileselect = document.getElementById($fileselectid),
            filedrag = document.getElementById($filedragid);

        // file select
        filedrag.addEventListener("dragover", FileDragHover, false);
        filedrag.addEventListener("dragleave", FileDragHover, false);
        fileselect.addEventListener("change", FileSelectHandler, false);
        filedrag.addEventListener("drop", FileSelectHandler, false);
        filedrag.addEventListener("click", OpenFileOption, false);
    }

    function showPreloader() {
        $('#loader').show();
    }

    function hidePreloader() {
        $('#loader').hide();
    }

    $('#grid').w2grid({
        name: 'grid',
        show: {
            footer        : true
        },
        columns: [
            { field: 'D_START_TIME', text: 'D_START_TIME', hidden: true },
            { field: 'sub1', text: 'Subtitle 1', size: '50%' },
            { field: 'sub2', text: 'Subtitle 2', size: '50%' }
        ]
    });

    function getData(objectData) {

        var sqlite3 = require('sqlite3');
        var db = new sqlite3.Database('data.db'); //':memory:'

        showPreloader();

        db.each("SELECT COUNT(*) COUNT  FROM (SELECT N_SUB_ID FROM subtitle GROUP BY N_SUB_ID)", function(err, row) {
            if (row.COUNT == 2) {
                objectData.clear();
                objectData.refresh();

                //db.serialize(function() {
                db.all("SELECT 0 recid, D_START_TIME, sub1, S_SUB_TEXT sub2 FROM (SELECT subCross.D_START_TIME, subCross.sub1, subSS.S_SUB_TEXT FROM ( " +
                    "SELECT sub1.D_START_TIME, sub1.S_SUB_TEXT sub1, (SELECT sub2.N_NUM_COUNT FROM subtitle sub2 WHERE sub2.N_SUB_ID = 2 " +
                    "and sub2.D_START_TIME >= ((SELECT MAX(subD.D_START_TIME) FROM subtitle subD WHERE subD.N_SUB_ID = 1 and subD.D_START_TIME < sub1.D_START_TIME) + sub1.D_START_TIME)/2 " +
                    "and sub2.D_START_TIME <= ((SELECT MIN(subD.D_START_TIME) FROM subtitle subD WHERE subD.N_SUB_ID = 1 and subD.D_START_TIME > sub1.D_START_TIME) + sub1.D_START_TIME)/2) N_NUM_COUNT2 " +
                    "FROM subtitle sub1 WHERE sub1.N_SUB_ID = 1) subCross LEFT JOIN (SELECT subSel.N_NUM_COUNT, subSel.S_SUB_TEXT FROM subtitle subSel WHERE subSel.N_SUB_ID = 2) subSS " +
                    "ON subSS.N_NUM_COUNT = subCross.N_NUM_COUNT2 " +
                    "UNION ALL " +
                    "SELECT subOt.D_START_TIME, '', subOt.S_SUB_TEXT FROM subtitle subOt WHERE subOt.N_SUB_ID = 2 AND subOt.N_NUM_COUNT NOT IN ( " +
                    "SELECT N_NUM_COUNT FROM (SELECT (SELECT sub2.N_NUM_COUNT FROM subtitle sub2 WHERE sub2.N_SUB_ID = 2 " +
                    "and sub2.D_START_TIME >= ((SELECT MAX(subD.D_START_TIME) FROM subtitle subD WHERE subD.N_SUB_ID = 1 and subD.D_START_TIME < sub1.D_START_TIME) + sub1.D_START_TIME)/2 " +
                    "and sub2.D_START_TIME <= ((SELECT MIN(subD.D_START_TIME) FROM subtitle subD WHERE subD.N_SUB_ID = 1 and subD.D_START_TIME > sub1.D_START_TIME) + sub1.D_START_TIME)/2) N_NUM_COUNT " +
                    "FROM subtitle sub1 WHERE sub1.N_SUB_ID = 1) WHERE N_NUM_COUNT IS NOT NULL)) ORDER BY D_START_TIME",
                    function (err, rows) {
                    if (row == undefined) {
                        objectData.error(err);
                    } else {
                        for (i = 0; i < rows.length; i++) {
                            rows[i].recid = i;
                        }
                        //console.log(rows);
                        objectData.add(rows);
                    }
                });
                //});
            }
        });

        db.close(function () {
            hidePreloader();
        });
    }

    // call initialization file
    if (window.File && window.FileList && window.FileReader) {
        Init("fileselect1", "filedrag1");
        Init("fileselect2", "filedrag2");
        Init("fileselectvideo", "filedragvideo");

        //var sqlite3 = require('sqlite3');
        //var db = new sqlite3.Database(':memory:'); //':memory:'

        getData(w2ui['grid']);
        var lCount = 1;
        document.getElementById("buttonNext").onclick = function() {

            if(w2ui['grid'].getSelection()[0] == undefined)
            {
                w2ui['grid'].click(0) ;
            }
            switch(lCount) {
                case 3:
                    lCount = 0;
                    w2ui['grid'].click(w2ui['grid'].getSelection()[0] + 1) ;
                    document.getElementById('video').pause();
                    break;
                case 2:
                    $('#subtitle2').html(w2ui['grid'].records[w2ui['grid'].getSelection()[0]].sub2);
                case 1:
                    if(lCount == 1) $('#subtitle2').html("");
                    $('#subtitle1').html(w2ui['grid'].records[w2ui['grid'].getSelection()[0]].sub1);
                    document.getElementById('video').currentTime = w2ui['grid'].records[w2ui['grid'].getSelection()[0]].D_START_TIME;
                    document.getElementById('video').play();
                    break;
            }
            lCount++;
        };
    }

})();