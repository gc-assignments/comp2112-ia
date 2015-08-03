(function() {
  'use strict';

  /**
   * Notes!:
   *
   * use createElement + createTextNode + createFragment
   * because better performance and compatibility
   *
   * using Object Literal because only need one instance of calendar
   *
   */

  var SlimCal = {
    init: ajaxInit,
    loadData: loadData,
  };

  /**
   * AJAX initializing up calendar 
   *
   * AJAX because assignment requirement
   */
  function ajaxInit() {
    var request = new XMLHttpRequest();
    request.open('GET', '/data/calendar.json', true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        var data = JSON.parse(request.responseText);
        // load data into SlimCal and draw calendar
        SlimCal.loadData(data);
        // static content only called once onload
        SlimCal.appendWeekdayNames();
        // when it loads, active month is current month
        SlimCal.setThisMonth();
        SlimCal.generateCal();
      } else {
        // We reached our target server, but it returned an error
        showErrorFeedback();
        console.log('server returned error, status: ', request.status);
      }
    };

    request.onerror = function() {
      // There was a connection error of some sort
      showErrorFeedback();
      console.log('connection error, please try again');
    };

    request.send();
  }

  // in the event of AJAX fail, display helpful message on screen
  function showErrorFeedback() {
    var calendarEl = document.getElementById('calendar'),
        message = 'Error loading data, refresh to retry';
    calendarEl.innerHTML = '<tr>' + message + '</tr>';
  }

  // save JSON data to local properties for easy access
  function loadData(data) {
    SlimCal.months = data.months;
    SlimCal.daysInMonth = data.daysInMonth;
    SlimCal.weekDays = data.weekDays;
  }

  /**
   * append Sunday to Saturday to <thead>
   */
  SlimCal.appendWeekdayNames = function() {
    var weekdaysEl = document.getElementById('weekdays'),
        weekdaysFrag = createFrag();
    // append children to Dom fragment
    this.weekDays.forEach(function(day) {
      var td = createTD(day.slice(0,2));
      weekdaysFrag.appendChild(td);
    });
    // append whole fragment to make <thead> weekdays
    weekdaysEl.appendChild(weekdaysFrag);
  };

  /**
   * Main method for generating calendar
   *
   * The calendar has 42 days in total, including days for previous month and
   * next month, in order to account for these features, the days need to be
   * shifted base on what day is the first day of the active month
   *
   */
  SlimCal.generateCal = function() {
    var now = new Date();
    var today = now.getDate();
    // getting elements by ID, ready for content addition
    var yearEl = document.getElementById('year');
    var monthEl = document.getElementById('month');
    var calendarEl = document.getElementById('calendar');
    // getting active year and month so we know what calendar view should be
    // generated
    var year = this.activeYear;
    var month = this.activeMonth;
    var daysInMonth = this.daysInMonth;
    // if month is 0, previous month is 11
    var prevMonth = month - 1 >= 0 ? month - 1 : 11; 
    // find out which day is the first day of the active month
    var daysShifted = new Date(year, month, 1).getDay();
    // so that we can find out how many days shifted
    var shiftedDate = 1 - daysShifted;
    // for knowing the dates to show after the active month
    var monthLen = daysInMonth[month];
    // for calculating the dates to show before active month
    var prevMonthLen = daysInMonth[prevMonth];
    var daysInCal = 42;
    var rowFrag = createFrag();
    var calFrag = createFrag();

    yearEl.innerHTML = year;
    monthEl.innerHTML = this.months[month];

    // loop for producing structured html table with 7 td inside 6 tr
    for (var i = 0; i++ < daysInCal; shiftedDate++) {
      var td = getNormalizedTD(shiftedDate, monthLen, prevMonthLen, today);
      rowFrag.appendChild(td);
      // every 7 days, meaning each row or week, create and append new tr
      // to calendar fragment
      if (i % 7 === 0) {
        var tr = createTR();
        tr.appendChild(rowFrag);
        calFrag.appendChild(tr);
        rowFrag = createFrag();
      }
    }
    calendarEl.innerHTML = '';
    calendarEl.appendChild(calFrag);
    if (now.getFullYear() === year && now.getMonth() === month) {
      var todayEl = document.getElementById(today);
      todayEl.className += 'current-day';
    }
  };

  /**
   * Takes in shifted date e.g. [-2, -1, 0, 1, 2, ... 31, 32, 33, ...] 42 items
   * in total
   *
   * Output normalized date e.g. [28, 29, 30, 1, 2, ... 31, 1, 2, ...] 42 items
   * in total
   *
   * Also wrap dates in <td>
   */
  function getNormalizedTD(shiftedDate, monthLen, prevMonthLen, today) { 
    var date;
    if (shiftedDate < 1) {
      date = prevMonthLen + shiftedDate;
      return createTD(date, 'prev-month');
    } else if (shiftedDate > monthLen) {
      date = shiftedDate - monthLen;
      return createTD(date, 'next-month');
    } else {
      // false to suppress class creation for td element
      return createTD(shiftedDate, false, shiftedDate);
    }
  }

  /**
   * Helper functions for several document methods
   *
   * Reason: More Readable
   */
  function createFrag() {
    return document.createDocumentFragment();
  }

  function createTR() {
    return document.createElement('tr');
  }
  // create td with content, optional class and id
  function createTD(content, className, id) {
    var td = document.createElement('td'),
        txt = document.createTextNode(content);
    td.appendChild(txt);
    if (className)
      td.className += ' ' + className;
    if (id)
      td.id = id;
    return td;
  }

  /**
   * Once the DOM is loaded, add event listeners for changing month and year
   */
  SlimCal.events = {
    loaded: function() {
      document.addEventListener('DOMContentLoaded', function(event) {
        var changeMonthEl = document.getElementById('change-month');
        var changeYearEl = document.getElementById('change-year');
        // attatch events on parents and fire differnet callbacks based on
        // children
        changeMonthEl.addEventListener('click', handleChangeMonth);
        changeYearEl.addEventListener('click', handleChangeYear);
      });
    }

  };

  function handleChangeMonth(event) {
    if (event.target.id == 'prev-month') {
      SlimCal.setPrevMonth();
    } else if (event.target.id == 'next-month') {
      SlimCal.setNextMonth();
    } else {
      SlimCal.setThisMonth();
    }
    SlimCal.generateCal();
  }

  function handleChangeYear(event) { 
    if (event.target.id =='prev-year') {
      SlimCal.setPrevYear();
    } else if (event.target.id == 'next-year') {
      SlimCal.setNextYear();
    } else {
      SlimCal.setThisYear();
    }
    SlimCal.generateCal();
  }

  /**
   * self-explanatory functions for setting active month or year
   * on the calendar
   */
  SlimCal.setThisMonth = function() {
    var date = new Date();
    // keep track of active year and month, to handle next / prev click
    this.activeYear = date.getFullYear();
    this.activeMonth = date.getMonth();
  };

  SlimCal.setNextMonth = function() {
    // next month of the last month is the first month
    if (this.activeMonth >= 11) {
      this.activeMonth = 0;
      this.activeYear++;
    } else {
      this.activeMonth++;
    }
  };

  SlimCal.setPrevMonth = function() {
    // previous month of the first month is the last month
    if (this.activeMonth <= 0) {
      this.activeMonth = 11;
      this.activeYear--;
    } else {
      this.activeMonth--;
    }
  };

  SlimCal.setThisYear = function() {
    var date = new Date();
    this.activeYear = date.getFullYear();
  };

  SlimCal.setNextYear = function() {
    this.activeYear++;
  };

  SlimCal.setPrevYear = function() {
    this.activeYear--;
  };

  /**
   * Initialize calendar and event handlers
   */
  SlimCal.init();
  SlimCal.events.loaded();
}());
