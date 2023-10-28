import { Grid, Paper} from "@mantine/core";
import Sidebar from "./Sidebar.tsx";
import ShowStatus from "./ShowStatus.tsx";
import {useParams} from "react-router-dom";

export default function Status() {
    const { requestID } = useParams<{ requestID: string }>();
    return <Grid mb="md">
        <Grid.Col xs={1} sm={2}>
            <Sidebar selected="my-uploads" />
        </Grid.Col>
        <Grid.Col xs={12} sm={10}>
            {requestID &&  <Paper shadow="xl" p="md" withBorder>
                <ShowStatus requestID={requestID}  />
                </Paper>
            }
        </Grid.Col>
    </Grid>
}