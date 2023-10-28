import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from "apexcharts";

interface StackedBarProps {
    data: any
    title:string
    horizontal?:boolean
    hideEmpty?:boolean
    xaxisMax:number
}

export default function StackedBar({data, title, horizontal, hideEmpty, xaxisMax}:StackedBarProps ) {


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

    const series = [
        {
            name: 'Populated field count',
            data: Object.values(filteredObject) as number[]
        },
        {
            name: 'Empty field count',
            data: Object.values(filteredObject).map(value => {
                return xaxisMax - Number(value);
            }) as number[]
        }
    ];

    const options: ApexOptions = {
        series: series,
        chart: {
            type:  'bar',
            stacked: true
        },
        xaxis: {
            categories: Object.keys(filteredObject),
            max: xaxisMax
        },
        yaxis: {
            labels: {
                rotate: -20
            }
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val.toLocaleString() + "  (" + Math.floor((val / xaxisMax) * 100) + "%)"
                }
            }
        },
        stroke: {
            width: 1
        },
        plotOptions: {
            bar: {
                horizontal: !!horizontal,
                barHeight: '90%',
                distributed: false
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return  Math.floor(( Number(val) / xaxisMax) * 100) + "%";
            }
        },
        colors: ['#c44d34', '#A0A0A0'],
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

    return (
        <div>
            <ReactApexChart options={options} series={options.series} type="bar" height={Object.keys(filteredObject).length < 30 ? `500` : '1000'}   />
        </div>
    );
};

