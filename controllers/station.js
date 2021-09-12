"use strict";

const logger = require("../utils/logger");
const stationList = require("../models/station-list");
const uuid = require("uuid");
const stationAnalytics = require("../utils/station-analytics");
const axios = require("axios");

const station = {
  index(request, response) {
    const stationId = request.params.id;

    let latestReading = null;
    let weatherCode = null;
    let iconClass = null;
    let fahrenheit = null;
    let beaufort = null;
    let windDirection = null;
    let windChill = null;
    let minTemp = null;
    let maxTemp = null;
    let minWind = null;
    let maxWind = null;
    let minPressure = null;
    let maxPressure = null;
    let tempTrend = null;
    let tempArrow = null;
    let windTrend = null;
    let windArrow = null;
    let pressureTrend = null;
    let pressureArrow = null;

    const station = stationList.getStation(stationId);
    if (station.readings.length > 0) {
      latestReading = station.readings[station.readings.length - 1];
      weatherCode = stationAnalytics.codeToText(Number(latestReading.code));
      iconClass = stationAnalytics.weatherIcon(Number(latestReading.code));
      fahrenheit = stationAnalytics.fahrenheit(Number(latestReading.temp));
      beaufort = stationAnalytics.beaufort(Number(latestReading.windSpeed));
      windDirection = stationAnalytics.windCompass(
        Number(latestReading.windDirection)
      );
      windChill = stationAnalytics.windChillCalc(
        latestReading.temp,
        fahrenheit
      );
      minTemp = stationAnalytics.getMinTemp(station);
      maxTemp = stationAnalytics.getMaxTemp(station);
      minWind = stationAnalytics.getMinWind(station);
      maxWind = stationAnalytics.getMaxWind(station);
      minPressure = stationAnalytics.getMinPressure(station);
      maxPressure = stationAnalytics.getMaxPressure(station);
      tempTrend = stationAnalytics.tempTrend(station);
      tempArrow = stationAnalytics.trendArrow(tempTrend);
      windTrend = stationAnalytics.windTrend(station);
      windArrow = stationAnalytics.trendArrow(windTrend);
      pressureTrend = stationAnalytics.pressureTrend(station);
      pressureArrow = stationAnalytics.trendArrow(pressureTrend);
    }
    console.log("Station id = ", stationId);

    const viewData = {
      title: "Station",
      station: stationList.getStation(stationId),
      latestReading: latestReading,
      weatherCode: weatherCode,
      iconClass: iconClass,
      fahrenheit: fahrenheit,
      beaufort: beaufort,
      windDirection: windDirection,
      windChill: windChill,
      minTemp: minTemp,
      maxTemp: maxTemp,
      minWind: minWind,
      maxWind: maxWind,
      minPressure: minPressure,
      maxPressure: maxPressure,
      tempTrend: tempTrend,
      tempArrow: tempArrow,
      windTrend: windTrend,
      windArrow: windArrow,
      pressureTrend: pressureTrend,
      pressureArrow: pressureArrow
    };

    response.render("station", viewData);
  },

  deleteReading(request, response) {
    const stationId = request.params.id;
    const readingId = request.params.readingid;
    console.log(`Deleting Reading ${readingId} from Station ${stationId}`);
    stationList.removeReading(stationId, readingId);
    response.redirect("/station/" + stationId);
  },

  addReading(request, response) {
    const stationId = request.params.id;
    const station = stationList.getStation(stationId);

    const today = new Date();
    const time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const timeStamp =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate() +
      ", " +
      time;
    const newReading = {
      id: uuid.v1(),
      code: request.body.code,
      temp: request.body.temp,
      windSpeed: request.body.windSpeed,
      windDirection: request.body.windDirection,
      pressure: request.body.pressure,
      timeStamp: timeStamp
    };
    logger.debug("New Reading = ", newReading);
    console.log("Timestamp " + timeStamp);
    stationList.addReading(stationId, newReading);
    response.redirect("/station/" + stationId);
  },

  async addreport(request, response) {
    logger.info("rendering new report");
    let report = {};
    const stationId = request.params.id;
    const station = stationList.getStation(stationId);
    const lat = station.lat;
    const lng = station.lng;
    const today = new Date();
    const time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const timeStamp =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate() +
      ", " +
      time;

    const requestUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&units=metric&appid=742a1a8d76664e3b475d9aa44bf987c1`;
    const result = await axios.get(requestUrl);
    try {
      if (result.status == 200) {
        console.log(result.data);
        const reading = result.data.current;
        report.id = uuid.v1();
        report.code = reading.weather[0].id;
        report.temp = reading.temp;
        report.windSpeed = reading.wind_speed;
        report.pressure = reading.pressure;
        report.windDirection = reading.wind_deg;
        report.timeStamp = timeStamp;
        stationList.addReading(stationId, report);

        report.tempTrend = [];
        report.windTrend = [];
        report.pressureTrend = [];
        report.trendLabels = [];

        const trends = result.data.daily;
        for (let i = 0; i < trends.length; i++) {
          report.tempTrend.push(trends[i].temp.day);
          report.windTrend.push(trends[i].wind_speed);
          report.pressureTrend.push(trends[i].pressure);
          const date = new Date(trends[i].dt * 1000);
          report.trendLabels.push(
            `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`
          );
        }
      }
    } catch {
      console.log("error");
    }

    console.log(report);

    const viewData = {
      title: "Weather Report",
      reading: report,
      stationId: stationId,
      station: stationList.getStation(stationId)
    };
    console.log("Station Name " + station.name);
    response.render("station", viewData);
  }
};

module.exports = station;
