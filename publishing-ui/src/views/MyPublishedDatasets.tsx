import { Grid, Skeleton, Space, Table, Text, Title, Button, Anchor} from "@mantine/core";
import Sidebar from "./Sidebar.tsx";
import {useEffect, useState} from "react";
import {User} from "oidc-client-ts";

interface Dataset {
    uid: string;
    name: string;
    uri: string;
}

export default function MyPublishedDatasets() {

    const [ uploads, setUploads ] = useState<any>(null);
    const [ loading, setLoading ] = useState<boolean>(true);
    const oidcStorage = localStorage.getItem(`oidc.user:${import.meta.env.VITE_OIDC_AUTH_SERVER}:${import.meta.env.VITE_OIDC_CLIENT_ID}`);

    let rows = [...Array(12)].map((_,) => (
        <tr>
            <td><Skeleton height={24} mt={6} radius="xl"/></td>
            <td><Skeleton height={24} mt={6} radius="sm"/></td>
            <td><Skeleton height={24} mt={6} radius="sm"/></td>
        </tr>
    ));

    useEffect(() => {
        if (oidcStorage) {
            let user = User.fromStorageString(oidcStorage);
            // Fetch data from the JSON REST web service
            fetch(`${import.meta.env.VITE_APP_COLLECTORY_URL}/ws/dataResource?createdByID=${user?.profile?.userid}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    setUploads(data);
                    setLoading(false);
                })
                .catch(error => {
                    setLoading(false);
                    console.error('Error fetching data:', error);
                });
        }
    }, []);

    if (!loading) {
        rows = uploads.map((dataset: Dataset) => (
            <tr key={dataset?.uid}>
                <td>
                    <Text fz="lg">
                        <Anchor href={`${import.meta.env.VITE_APP_COLLECTORY_URL}/public/show/${dataset.uid}`} >
                            {dataset.name}
                        </Anchor>
                    </Text>
                </td>
                <td>
                    <Button size="xs" variant="outline" onClick={() => alert('Not implemented yet')}>
                        Republish
                    </Button>
                </td>
                <td>
                    <Button size="xs" variant="outline" onClick={() => alert('Not implemented yet')}>
                        Unpublish
                    </Button>
                </td>
            </tr>
        ));
    }

    return <Grid mb="md">
        <Grid.Col xs={1} sm={2}>
            <Sidebar selected="my-uploads" />
        </Grid.Col>
        <Grid.Col xs={12} sm={10}>
            <Title order={3} size="h1">My published datasets</Title>
            <Space h="lg"/>
            <Table>
                <thead>
                <tr>
                    <th>Dataset</th>
                    <th></th>
                    <th></th>
                </tr>
                </thead>
                <tbody>{rows}</tbody>
            </Table>
        </Grid.Col>
    </Grid>
}