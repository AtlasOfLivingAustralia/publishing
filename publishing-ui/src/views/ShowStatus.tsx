import {Title, Anchor,Group, List, Loader, Space, Text, ThemeIcon} from "@mantine/core";
import {useEffect, useState} from "react";
import {IconArrowRight, IconCircle, IconCircleCheck} from "@tabler/icons-react";

interface StatusProps {
    requestID: string
    completed?: () => void
    failed?: ()=> void
}

export default function ShowStatus({requestID, completed, failed}:StatusProps) {

    const [ status, setStatus ] = useState<any>(null);
    const [ loading, setLoading ] = useState<boolean>(true);
    function updateStatus(): Promise<any> {
        return new Promise((resolve, reject) => {
            fetch(import.meta.env.VITE_APP_PUBLISH_URL + '/status/' + requestID)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    setStatus(data);
                    setLoading(false);
                    resolve(data); // Resolve the Promise with the fetched data
                })
                .catch(error => {
                    setLoading(false);
                    console.error('Error fetching data:', error);
                    reject(error); // Reject the Promise with the error
                });
        });
    }

    useEffect(() => {

        const interval = setInterval(() => {
            // Fetch data from the JSON REST web service
            updateStatus().then(data => {
                // Do something with the fetched data (data variable)
                console.log('Fetched data:', data);

                // Check if the updateStatus function returns a specific value
                if (data?.state === 'success' || data?.state === 'failed' ) {
                    clearInterval(interval); // Stop the interval
                }
                if (data?.state === 'success' && completed) {
                    completed();
                }
                if (data?.state === 'failed' && failed) {
                    failed();
                }
            })
            .catch(error => {
                // Handle errors if necessary
                console.error('Error fetching data:', error);
            });
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return <>
                { (loading || !status) && <>
                    <Group>
                        <Loader />
                        <Text size={`xl`}>Retrieving status....</Text>
                    </Group>
                    </>
                }

                {!loading &&  <>

                    { status?.state === 'running' && <>
                        <Group>
                            <Loader />
                            <Title order={3} size="h3">Publishing the dataset "{status.dataset_name}"</Title>
                        </Group>
                        <Space h="lg"/>
                        <Text>
                            You can keep track of the progress of this
                            upload by keeping this page open.
                            <br/>
                            An upload will typically take <b>20 minutes to complete</b>.
                            <br/>
                            <br/>
                            Once complete there will be links here to viewing occurrence in the Atlas.
                        </Text>
                        <Space h="lg"/>
                        <List  spacing="lg"
                               size="lg"
                               center
                               icon={
                                   <ThemeIcon color="gray" size={36} radius="xl">
                                       <IconArrowRight size="2rem" />
                                   </ThemeIcon>
                               }>
                            <List.Item><Anchor href={import.meta.env.VITE_APP_COLLECTORY_URL + "/public/show/" + status.datasets} target={`_blank`}>View metadata page </Anchor></List.Item>
                        </List>
                    </>}

                    { status?.state === 'success' && <>
                        <Group>
                            <ThemeIcon color="gray" size={42} radius="xl">
                                <IconCircleCheck size="2rem" />
                            </ThemeIcon>
                            <Title order={3} size="h3">Dataset "{status.dataset_name}" published</Title>
                        </Group>
                        <Space h="lg"/>
                        <Text>
                            This dataset has been successfully published to the Atlas.
                        </Text>
                        <Space h="lg"/>
                        <List  spacing="lg"
                                size="lg"
                                center
                                icon={
                                    <ThemeIcon color="gray" size={36} radius="xl">
                                        <IconArrowRight size="2rem" />
                                    </ThemeIcon>
                                }>
                            <List.Item><Anchor href={import.meta.env.VITE_APP_COLLECTORY_URL + "/public/show/" + status.datasets} target={`_blank`}> View metadata page </Anchor></List.Item>
                            <List.Item><Anchor href={import.meta.env.VITE_APP_BIOCACHE_URL + "/occurrences/search?q=dataResourceUid:" + status.datasets} target={`_blank`}> View occurrences </Anchor></List.Item>
                        </List>
                        <Space h="lg"/>
                    </>}

                    { status?.state === 'failed' && <>
                        <Group>
                            <IconCircle />
                            <Title order={3} size="h3">Dataset publishing failed for "{status.dataset_name}"</Title>
                        </Group>
                        <Space h={30} />
                        <Text>
                            There was a problem loading this dataset.
                        </Text>
                    </>}

                    { status?.state === 'queued' && <>
                        <Group>
                            <IconCircle />
                            <Title order={3} size="h3">Dataset publishing queued</Title>
                        </Group>
                        <Space h={30} />
                        <Text>
                            The dataset is in the queue to be published.
                        </Text>
                    </>}
                </>}

                <Space h="lg"/>
                <Text  size="xs" style={{color: 'gray', float: 'right'}}>Request ID: {requestID}</Text>
                <Space h="lg"/>
            </>;
}