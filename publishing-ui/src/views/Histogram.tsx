import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from "apexcharts";

interface HistogramProps {
    data: any
    title:string
    fieldName: string
    horizontal?:boolean
    hideEmpty?:boolean
}

export default function Histogram({data, title, fieldName, horizontal, hideEmpty}:HistogramProps ) {

    if (!data) return (<div></div>);

    let filteredObject = {} as any;
    if (hideEmpty) {
        for (let key in data) {
            if (data[key] > 0) {
                filteredObject[key] = data[key];
            }
        }
    } else {
        filteredObject = data;
    }

    const keys = Object.keys(filteredObject);

    const options: ApexOptions = {
        chart: {
            type:  'bar'
        },
        xaxis: {
            categories: keys,
        },
        yaxis: {
            labels: {
                rotate: -20
            }
        },
        tooltip: {
            x: {
                formatter: function (val) {
                    return fieldName + ": " + val.toLocaleString();
                }
            },
            y: {
                formatter: function (val) {
                    return val.toLocaleString();
                }
            }
        },
        stroke: {
            width: 1
        },
        plotOptions: {
            bar: {
                horizontal: !!horizontal,
                barHeight: '95%',
                distributed: false
            }
        },
        colors: ['#c44d34'],
        title: {
            text: title,
            align: 'center',
            style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#CCC',
            },
        },
    };

    //ApexAxisChartSeries
    const series: ApexNonAxisChartSeries = [
        {
            name: 'Records',
            data: Object.values(filteredObject)
        }
    ] as unknown as ApexNonAxisChartSeries;

    return (
        <div>
            <ReactApexChart options={options} series={series} type="bar" height={`auto`}  />
        </div>
    );
};

