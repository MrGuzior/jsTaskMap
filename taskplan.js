var taskdetail=[];

(function($) {
  'use strict';
 var map;
 var airspacePolygons = [];
 var polygonBases =[];
 var  airspaceCircles = [];
var circleBases = [];
 var markerList = [];
  var tpinfo = [];
  var labelList = [];
  var markersShowing ;
  var taskdef=[];
   var taskLine = null;
   
 var airDrawOptions = {
    strokeColor: 'black',
    strokeOpacity: 0.8,
    strokeWeight: 1,
    fillColor: '#FF0000',
    fillOpacity: 0.2,
    clickable: false
  };
  
  function bindTaskButtons() {
    $('#tasktab button').on('click', function(event) {
      var li = $(this).parent().parent().index();
      if ($(this).text() === "X") {
        taskdef.splice(li, 1);
      } else {
        var holder = taskdef[li];
        var prevpt = taskdef[li - 1];
        taskdef[li] = prevpt;
        taskdef[li - 1] = holder;
      }
      updateTask();
    });
  }
  
   function updateTask() {
    var i;
    var newrow;
    var tpref;
    var distance = 0;
    var pointref;
    var taskcoords = [];
    var ptcoords = {};

    $('#tasktab').html("");
    $('#tasklength').text("");
    for (i = 0; i < taskdef.length; i++) {
      switch (i) {
        case 0:
          tpref = "Start";
          break;
        case taskdef.length - 1:
          tpref = "Finish";
          break;
        default:
          tpref = "TP" + i.toString();
      }
      pointref = taskdef[i];
      newrow = "<tr><td>" + tpref + "</td><td>" + tpinfo[pointref].trigraph + "</td><td>" + showpoint(tpinfo[pointref]) + "</td><td>";
      if (i === 0) {
        newrow += "&nbsp;";
      } else {
        newrow += "<button>&uarr;</button></td>";
      }
      newrow += "</td><td><button>X</button></td></tr>";
      $('#tasktab').append(newrow);
      ptcoords = {
        lat: tpinfo[pointref].latitude,
        lng: tpinfo[pointref].longitude
      };
      taskcoords.push(ptcoords);
      if (i > 0) {
        distance += leginfo(tpinfo[taskdef[i - 1]], tpinfo[pointref]).distance;
      }
      if (taskLine) {
        taskLine.setMap(null);
        taskLine = null;
      }
      taskLine = new google.maps.Polyline({
        path: taskcoords,
        strokeColor: 'black',
        strokeOpacity: 1.0,
        strokeWeight: 2
      });
      taskLine.setMap(map);
      if (taskcoords.length === 2) {
        $('.printbutton').prop("disabled", false);
      }
      if (taskcoords.length === 1) {
        $('.printbutton').prop("disabled", true);
      }
    }

    if (distance > 0) {
      $('#tasklength').text("Task length: " + (distance).toFixed(1) + "Km");
    }
     bindTaskButtons();
  }
  
   function changeBase() {
    var clipalt = $('#airclip').val();
    var i;
    var j;
    for (i = 0; i < airspacePolygons.length; i++) {
      if (polygonBases[i] < clipalt) {
        airspacePolygons[i].setMap(map);
      } else {
        airspacePolygons[i].setMap(null);
      }
    }
    for (j = 0; j < airspacePolygons.length; j++) {
      if (circleBases[j] < clipalt) {
        airspaceCircles[j].setMap(map);
      } else {
        airspaceCircles[j].setMap(null);
      }
    }
  }
  
   function storePreference(name, value) {
    if (window.localStorage) {
      try {
        localStorage.setItem(name, value);
      } catch (e) {
        // If permission is denied, ignore the error.
      }
    }
  }
  
  function makeLabel(labelinfo,offset) {
    var myOptions = {
      content: labelinfo,
      boxClass: 'infoBox',
      disableAutoPan: true,
      pixelOffset: offset,
      closeBoxURL: "",
     visible : true,
      enableEventPropagation: true
    };
    var ibLabel = new InfoBox(myOptions);
    return ibLabel;
  }
  
  function maketps() {
      var i;
      var marker;
      var label;
      var labelOffset=new google.maps.Size(-15, 0);
      for(i=0;i < tpinfo.length; i++) {
          marker=new google.maps.Marker({
          icon: 'marker-icon.png',
          position: {
          lat: tpinfo[i].latitude,
          lng: tpinfo[i].longitude
      },
         title: tpinfo[i].tpname
      });
        marker.index = i;
        marker.addListener('click', function() {
      taskdef.push(this.index);
     updateTask();
    });
       marker.setMap(map);
       markerList.push(marker);
       markersShowing=true;
       label=makeLabel(tpinfo[i].trigraph,labelOffset);
      labelList.push(label);
      }
  }
  
  function getPoints() {
      $.getJSON("getpoints.php", function(data) {
          tpinfo=data;
          maketps();
      });
  }
  
 function getAirspace() {
    var i;
    var newPolypts = [];
    var newPolybases = [];
    var newCircles = [];
    var newCirclebases = [];
    var clipalt = $('#airclip').val();
    var j;
     $.post("getairspace.php", {
          country: "uk"
        },
        function(data, status) {
          if (status === "success") {
            for (i = 0; i < data.polygons.length; i++) {
              airspacePolygons[i] = new google.maps.Polygon(airDrawOptions);
              airspacePolygons[i].setPaths(data.polygons[i].coords);
              polygonBases[i] = data.polygons[i].base;
            }
            for (j = 0; j < data.circles.length; j++) {
              airspaceCircles[j] = new google.maps.Circle(airDrawOptions);
              airspaceCircles[j].setRadius(1000 * data.circles[j].radius);
              airspaceCircles[j].setCenter(data.circles[j].centre);
              circleBases[j] = data.circles[j].base;
            }
            changeBase();
          }
        }, "json");
 }
 
 function showLabels() {
    var i;
    if(!(markersShowing)) {
        showMarkers();
        $('input:radio[name=wpt_vis]')[0].checked = true;
    }
    for (i = 0; i < markerList.length; i++) {
        labelList[i].open(map, markerList[i]);
    }
  }

  function hideLabels() {
    var i;
    for (i = 0; i < markerList.length; i++) {
         labelList[i].close();
    }
  }
 
 function showMarkers() {
    var i;
    for (i = 0; i < markerList.length; i++) {
      markerList[i].setMap(map);
    }
    markersShowing=true;
  }

  function hideMarkers() {
    var i;
    for (i = 0; i < markerList.length; i++) {
      markerList[i].setMap(null);
    }
    markersShowing=false;
  }

  function exportTask(url) {
     taskdetail = [];
    var i;
    for (i = 0; i < taskdef.length; i++) {
      taskdetail.push(tpinfo[taskdef[i]]);
    }
    window.open(url, "_blank");
  }
 
 $(document).ready(function() {
    var mapOpt = {
      center: new google.maps.LatLng(53.5, -1),
      zoom: 7,
      maxZoom: 18,
      streetViewControl: false
    };
    map = new google.maps.Map($('#map').get(0), mapOpt);
    
     $('#airclip').change(function() {
      var clipping = $(this).val();
     storePreference("airspaceClip", clipping);
      changeBase();
    });

$(' input[name=wpt_vis]:radio').change(function() {
      if ($(this).val() === 'show') {
        showMarkers();
      } else {
        hideMarkers();
        hideLabels();
        $('input:radio[name=label_vis]')[1].checked = true;
      }
    });
     
$(' input[name=label_vis]:radio').change(function() {
      if ($(this).val() === 'show') {
        showLabels();
      } else {
        hideLabels();
      }
    });

$('#acceptor').click(function() {
      $('#disclaimer').hide();
     getAirspace();
      getPoints();
    $('input:radio[name=wpt_vis]')[0].checked = true;
    $('input:radio[name=label_vis]')[1].checked = true;
    $('#maincontrol').show();
    }); 



  $('#tasksheet').click(function() {
      exportTask("taskbrief.html");
    });

    $('#declaration').click(function() {
      exportTask("declaration.html");
    });

 var airspaceClip = '';
    if (window.localStorage) {
      try {
        airspaceClip = localStorage.getItem("airspaceClip");
        if (airspaceClip) {
          $('#airclip').val(airspaceClip);
        }
      } catch (e) {
        // If permission is denied, ignore the error.
      }
    }
 });
}(jQuery));
