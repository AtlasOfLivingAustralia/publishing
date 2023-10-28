import { useEffect, useState} from "react";
import {Badge, Text, Table, Grid, Skeleton, Title, Space} from "@mantine/core";
import {FormattedDate, FormattedTime} from "react-intl";
import Sidebar from "./Sidebar.tsx";
import {Link} from "react-router-dom";

interface Dataset {
   datasetId: string
   datasetName: string
}

interface JobRun {
    datasets: Array<Dataset>
    end_date: string
    id: string
    start_date: string
    state: string
    user: string
}

export default function Events() {

    // const currentUser = useContext(UserContext) as ALAUser;
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    function loadEvents() {
        fetch(import.meta.env.VITE_APP_PUBLISH_URL + '/events')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setLoading(false);
                setData(data);
            })
            .catch(error => {
                setLoading(false);
                console.error('Error fetching data:', error);
            });
    }

    useEffect(() => {

        loadEvents();

        const interval = setInterval(() => {
                // Fetch data from the JSON REST web service
            loadEvents();
        }, 30000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    function calcTimeInMin(jobRun: JobRun): number {
        const { start_date, end_date } = jobRun;
        const startDate = new Date(start_date);
        const endDate = end_date ? new Date(end_date) : new Date();
        if (isNaN(startDate.getTime()) || (end_date && isNaN(endDate.getTime()))) {
            throw new Error('Invalid date format in JobRun object');
        }
        const timeDifferenceInMilliseconds = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.round(timeDifferenceInMilliseconds / (1000 * 60));
    }

    let rows = [...Array(12)].map((_,) => (
        <tr>
            <td><Skeleton height={24} mt={6} radius="xl"/></td>
            <td><Skeleton height={24} mt={6} radius="xl"/></td>
            <td><Skeleton height={24} mt={6} radius="xl"/></td>
            <td><Skeleton height={24} mt={6} radius="xl"/></td>
            <td><Skeleton height={24} mt={6} radius="xl"/></td>
            <td><Skeleton height={24} mt={6} radius="xl"/></td>
        </tr>
    ));

    if (!loading) {
        rows = data.map((jobRun: JobRun) => (
            <tr key={jobRun?.id}>
                <td>
                    <Text fz="lg">
                        {jobRun?.datasets.map(dataset => <DatasetLink datasetId={dataset.datasetId}
                                                                      datasetName={dataset.datasetName}/>)}
                    </Text>
                </td>
                <td>
                    {jobRun?.user}
                </td>
                <td>
                    <FormattedDate value={jobRun?.start_date} dateStyle={"full"}/>
                </td>
                <td>
                    <FormattedTime value={jobRun?.start_date}/>
                    {jobRun?.end_date && <> to <FormattedTime value={jobRun?.end_date}/></>}
                </td>
                <td>
                    <Text fz="lg">
                        {calcTimeInMin(jobRun)} minutes
                    </Text>
                </td>
                <td>
                    <Link to={`/status/` + jobRun.id}>
                    <Badge variant={`outline`} size={`xl`} color={jobRun?.state != 'running' ? 'gray' : ''}>
                        {jobRun?.state}
                    </Badge>
                    </Link>
                </td>
            </tr>
        ));
    }

    return <>
        <Grid mb="md">
            <Grid.Col xs={1} sm={2}>
                <Sidebar selected="history" />
            </Grid.Col>
            <Grid.Col xs={12} sm={10}>
                <Title order={3} size="h1">Recent publication events</Title>
                <Space h="lg"/>
                <Table>
                    <thead>
                    <tr>
                        <th>Datasets</th>
                        <th>Loaded by</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Time taken / elapsed</th>
                        <th>State</th>
                    </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </Table>
            </Grid.Col>
        </Grid>
    </>;
}

export function DatasetLink(props: { datasetId: string, datasetName: string }) {
    return <a href={import.meta.env.VITE_APP_COLLECTORY_URL + `/public/show/${props.datasetId}`}>{props.datasetName}</a>
}