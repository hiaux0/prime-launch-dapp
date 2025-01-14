import { AureliaHelperService } from "services/AureliaHelperService";
import { autoinject } from "aurelia-framework";
import "./spark-chart.scss";
import { createChart, CrosshairMode, IChartApi, ISeriesApi, LineWidth, LineStyle} from "lightweight-charts";
import { bindable } from "aurelia-typed-observable-plugin";
import { NumberService } from "services/NumberService";
import { DateService } from "services/DateService";

interface ISeries {
  name: string,
  data: Array<any>,
  color: string,
  lineStyle?: LineStyle,
  lineWidth?: LineWidth,
}

@autoinject
export class SparkChart {
  @bindable chartConfig: Array<ISeries>;
  @bindable.booleanAttr gridHorizontal = false;
  @bindable.booleanAttr gridVertical = false;
  @bindable.booleanAttr interactive;
  @bindable.number height = 300;
  @bindable.number width = 500;
  @bindable.boolean utc = false;
  @bindable.booleanAttr timescaleBorder = false;
  @bindable.booleanAttr priceScaleBorder = false;

  chart: IChartApi;
  series: Array<ISeriesApi<"Line">> = [];

  container: HTMLElement;
  sparkChart: HTMLElement;

  constructor(
    private numberService: NumberService,
    private aureliaHelperService: AureliaHelperService,
    private dateService: DateService,
  ) {
  }

  attached(): void {
    this.aureliaHelperService.createPropertyWatch(this.container, "offsetWidth", () => this.resizeChart());

    if (!this.chart) {
      this.buildChart();
    }

    this.chartConfigChanged();
  }

  private resizeChart() {
    if (this.chart && this.chartConfig && this.container) {
      this.chart.resize(this.container.offsetWidth, this.container.offsetHeight);
      this.chart.timeScale().fitContent();
    }
  }

  buildChart(): void {
    const options: any = { // DeepPartial<ChartOptions> = {
      width: this.width,
      height: this.height,
      timeScale: {
        rightBarStaysOnScroll: true,
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        borderVisible: this.timescaleBorder,
        borderColor: "#fff",
        tickMarkFormatter: (time) => {
          return this.dateService.ticksToString(
            time * 1000, // to milliseconds
            {format: "DD MMM", utc: this.utc || false},
          );
        },
      },
      crosshair: {
        vertLine: {
          visible: true,
          width: 1,
          color: "#98979b", // $Neutral02
          style: 0,
        },
        horzLine: {
          visible: true,
          width: 1,
          color: "#98979b", // $Neutral02
          style: 0,
        },
        mode: CrosshairMode.Magnet,
      },
      priceScale: {
        position: "right",
        borderVisible: this.priceScaleBorder,
        borderColor: "#fff",
      },
      localization: {
        priceFormatter: price =>
          "$ " + price.toFixed(2),
        timeFormatter: time => {
          return this.dateService.ticksToString(
            time * 1000, // to milliseconds
            {format: "MMM D | H:mm", utc: this.utc || false},
          );
        },
      },
      grid: {
        horzLines: {
          visible: this.gridHorizontal,
          color: "#403453", // $Border01
        },
        vertLines: {
          visible: this.gridVertical,
          color: "#403453", // $Border01
        },
      },
      layout: {
        backgroundColor: "transparent",
        textColor: "white",
        fontFamily: "Inter",
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: this.interactive,
        horzTouchDrag: this.interactive,
        vertTouchDrag: this.interactive,
      },
      handleScale: {
        mouseWheel: this.interactive,
        pinch: this.interactive,
        axisDoubleClickReset: this.interactive,
        axisPressedMouseMove: {
          time: false,
          price: false,
        },
      },
    };

    // we want dimensions not-including padding
    const innerDimensions = this.innerDimensions(this.sparkChart);
    options.width = this.width || innerDimensions.width;
    options.height = this.height || innerDimensions.height;

    this.chart = createChart(this.sparkChart, options);
  }

  private chartConfigChanged(): void {
    if (this.chartConfig && this.chart) {
      if (!this.series?.length) {
        const seriesCollection = new Array<ISeriesApi<"Line">>();
        this.chartConfig.forEach((series) => {
          const newSeries = this.chart.addLineSeries({
            color: series.color,
            priceLineVisible: false,
            title: series.name || "",
            crosshairMarkerVisible: this.interactive,
            priceFormat: {
              type: "custom",
              formatter: value => `${this.numberService.toString(value, {
                mantissa: 2,
                thousandSeparated: true,
              })}`,
            },
          });
          newSeries.applyOptions({
            lineStyle: series.lineStyle || 0,
            lineWidth: series.lineWidth || 2,
          });
          seriesCollection.push(newSeries);
        });

        this.series = seriesCollection;
      }

      let dataPoints = 0;
      this.chartConfig.forEach((series, index) => {
        if (series.data?.length) {
          if (series.data.length > dataPoints) dataPoints = series.data.length;
          this.series[index].setData(series.data.map(item => ({
            time: item.time,
            value: item.price,
          })));
          this.resizeChart();
        }
      });

      let formatUnits = "";
      if (dataPoints <= 24 + 2) {
        formatUnits = "H:mm";
      } else if (dataPoints <= 24 * 5 + 2) {
        formatUnits = "MMM D H:mm";
      } else {
        formatUnits = "MMM D";
      }

      this.chart.applyOptions({
        timeScale: {
          tickMarkFormatter: (time) => {
            return this.dateService.ticksToString(
              time * 1000, // to milliseconds
              {format: formatUnits, utc: this.utc || false},
            );
          },
        },
      });

      // Wait until chart is rendered in the DOM and then resize it
      setTimeout(() => {
        this.chart.timeScale().fitContent();
        this.resizeChart();
      }, 250);
    }
  }

  private innerDimensions(node: HTMLElement): { width: number, height: number } {
    const computedStyle = window.getComputedStyle(node);

    let width = node.clientWidth; // width with padding
    let height = node.clientHeight; // height with padding

    height -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
    width -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
    return { height, width };
  }
}
