import {
    Group,
    Text,
    useMantineTheme,
    rem,
    Grid,
    Space,
    TextInput,
    Select,
    Button,
    Stepper,
    Title,
    Image,
    Tabs,
    LoadingOverlay,
    Progress,
    Loader, Paper, Textarea, Divider, Alert
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {IconUpload, IconX, IconCircleX, IconFileX, IconAlertCircle, IconFile, IconNote, IconCircleCheck, IconMap, IconChartBar, IconTable} from '@tabler/icons-react';
import {Dropzone, FileWithPath} from '@mantine/dropzone';
import {useEffect, useState} from "react";
import {useForm} from "@mantine/form";
import {User} from "oidc-client-ts";
import Sidebar from "./Sidebar.tsx";
import {useAuth} from "react-oidc-context";
import ShowStatus from "./ShowStatus.tsx";
import {FormattedNumber, FormattedMessage} from 'react-intl';
import Histogram from "./Histogram.tsx";
import axios from 'axios';
import StackedBar from "./StackedBar.tsx";

interface License {
    value: string;
    label: string;
}

interface DatasetUpload {
    name: string
    pubDescription: string
    licenceUrl: string
    citation: string
    rights: string
    purpose: string
    methodStepDescription: string
    qualityControlDescription: string
}

interface ValidationReport {
    valid: boolean,
    recordType: string,
    record_count: number,
    datasetType: string,
    errors: Array<string>,
    warnings: Array<string>,
    column_counts: any
}

interface ValidatorResponse {
    valid: boolean,
    datasetType: string | null,
    breakdowns: any | null,
    fileName: string | null,
    requestID: string,
    tempPath: string,
    metadata: any | null,
    hasEml: boolean,
    coreValidation: ValidationReport,
    extensionValidations: Array<ValidationReport>,
    mapImage: string | null,
    message: string | null
    error: string | null
}

export default function Publish() {

    const theme = useMantineTheme();
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploaded, setUploaded] = useState<ValidatorResponse | null>(null); // Replace 'any' with actual uploaded data type
    const [uploadedPercentage, setUploadedPercentage] = useState<any>(0); // Replace 'any' with actual uploaded data type
    const [ingesting, setIngesting] = useState<boolean>(false);
    const [ingestDetails, setIngestDetails] = useState<any | null>(null);
    const oidcStorage = localStorage.getItem(`oidc.user:${import.meta.env.VITE_OIDC_AUTH_SERVER}:${import.meta.env.VITE_OIDC_CLIENT_ID}`);
    const [user, setUser] = useState<User | null>(null);
    const auth = useAuth();
    const [active, setActive] = useState(0);
    const maxFileSize = 1024 * 1024 * 1024;

    const recognisedLicences: License[] = [
        { value: "https://creativecommons.org/publicdomain/zero/1.0/legalcode", label: "Creative Commons Zero" },
        { value: "https://creativecommons.org/licenses/by/4.0/legalcode", label: "Creative Commons By Attribution 4.0" },
        { value: "https://creativecommons.org/licenses/by-nc/4.0/legalcode", label: "Creative Commons Attribution-Noncommercial  4.0" },
        { value: "https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode", label: "Creative Commons Attribution-Noncommercial Share Alike 4.0"},
        { value: "https://creativecommons.org/licenses/by/3.0/legalcode", label: "Creative Commons By Attribution 3.0" },
        { value: "https://creativecommons.org/licenses/by-nc/3.0/legalcode", label: "Creative Commons Attribution-Noncommercial 3.0" },
        { value: "https://creativecommons.org/licenses/by-nc-sa/3.0/legalcode", label: "Creative Commons Attribution-Noncommercial Share Alike 3.0"}
    ];

    useEffect(() => {
        if (oidcStorage) {
            let user = User.fromStorageString(oidcStorage);
            setUser(user);
        }
    }, []);

    const uploadForm = useForm({
        initialValues: {
            name: '',
            pubDescription: '',
            licenceUrl: '',
            citation: '',
            rights: '',
            purpose: '',
            methodStepDescription: '',
            qualityControlDescription: ''
        },
        validate: {
            name: (value) => (!value ? "Please supply a name" : null),
            pubDescription: (value) => (!value ? "Please supply a description" : null),
            licenceUrl: (value) => (!value ? "Please select a licence" : null),
            citation: (value) => (!value ? "Please supply a citation" : null),
            rights: (value) => (!value ? "Please supply rights" : null),
        },
    });

    function reset(){
        setIngestDetails(null);
        setActive(0);
        setUploaded(null);
        setIngesting(false);
        setUploading(false);
    }

    function isUrlRecognised(url: string): boolean {
        if (url)
            return recognisedLicences.some((license: License) => url.includes(license.value));
        return false;
    }

    function findUrlRecognised(url: string): string | undefined {
        if (url)
            return recognisedLicences.find((license: License) => url.includes(license.value))?.value;
        return undefined;
    }

    function startIngest(datasetUpload: DatasetUpload){

        if (!uploaded){
            return;
        }

        setIngesting(true);
        const oidcStorage = localStorage.getItem(`oidc.user:${import.meta.env.VITE_OIDC_AUTH_SERVER}:${import.meta.env.VITE_OIDC_CLIENT_ID}`);

        if (oidcStorage) {

            const user = User.fromStorageString(oidcStorage);
            let token = null;
            if (!user.expired) {
                token = user?.access_token;
                const roles = (user?.profile?.role || []) as string[];
                const isAdmin = roles.includes(import.meta.env.VITE_ROLE_ADMIN);
                const isPublisher = roles.includes(import.meta.env.VITE_ROLE_PUBLISHER);
                if (!isAdmin && !isPublisher){
                    notifications.show({
                        id: 'unauthorised-to-publish',
                        withCloseButton: true,
                        autoClose: 5000,
                        title: "You are not authorised to publish datasets",
                        message: 'Please contact the Atlas data management team if you wish to publish data',
                        icon: <IconX />,
                        className: 'my-notification-class',
                        loading: false,
                    });
                    setIngesting(false);
                    return;
                }
            } else {
                localStorage.removeItem(`oidc.user:${import.meta.env.VITE_OIDC_AUTH_SERVER}:${import.meta.env.VITE_OIDC_CLIENT_ID}`);

            }
            const formData = new FormData();
            function appendIfDefined(fieldName: string, value: string) {
                if (value !== undefined && value !== null) {
                    formData.append(fieldName, value);
                }
            }

            appendIfDefined("requestID", uploaded.requestID);
            appendIfDefined("tempPath", uploaded.tempPath);
            appendIfDefined("name", datasetUpload.name);
            appendIfDefined("pubDescription", datasetUpload.pubDescription);
            appendIfDefined("citation", datasetUpload.citation);
            appendIfDefined("rights", datasetUpload.rights);
            appendIfDefined("purpose", datasetUpload.purpose);
            appendIfDefined("methodStepDescription", datasetUpload.methodStepDescription);
            appendIfDefined("qualityControlDescription", datasetUpload.qualityControlDescription);
            appendIfDefined("licenceUrl", datasetUpload.licenceUrl);

            fetch(import.meta.env.VITE_APP_PUBLISH_URL + "/validate/publish", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            })
            .then((res) => {
                const respJson = res.json();
                respJson.then(
                    function (data) {
                        if (!data.error) {
                            setActive(4);
                            setIngestDetails(data);
                            console.log(data);
                        } else {
                            setIngesting(false);
                            notifications.show({
                                id: 'unable-to-publish',
                                withCloseButton: true,
                                autoClose: 5000,
                                title: "There was a problem publishing this dataset",
                                message: data.error,
                                icon: <IconX />,
                                className: 'my-notification-class',
                                loading: false,
                            });
                        }
                    },
                    function (error) {
                        console.log(error);
                        notifications.show({
                            id: 'unable-to-publish',
                            withCloseButton: true,
                            autoClose: 5000,
                            title: "There was a problem publishing this dataset",
                            message: 'Please contact the Atlas data management team if this problem persists ' + error,
                            icon: <IconX />,
                            className: 'my-notification-class',
                            loading: false,
                        });
                        setIngesting(false);
                    }
                );

                return respJson;
            })
            .catch((err) => {
                // setUploading(false);
                console.log("File upload error", err);
                notifications.show({
                    id: 'unable-to-publish',
                    withCloseButton: true,
                    autoClose: 5000,
                    title: "There was a problem publishing this dataset",
                    message: 'Please contact the Atlas data management team if this problem persists',
                    icon: <IconX />,
                    className: 'my-notification-class',
                    loading: false,
                });
                setIngesting(false);
            });
        }
    }

    function validateFile(files:FileWithPath[]){
        setUploadedPercentage(0);
        setUploading(true);

        const formData = new FormData();
        // @ts-ignore
        formData.append("storeTemp", 'true');
        formData.append("file", files[0]);
        const oidcStorage = localStorage.getItem(`oidc.user:${import.meta.env.VITE_OIDC_AUTH_SERVER}:${import.meta.env.VITE_OIDC_CLIENT_ID}`);

        if (oidcStorage) {

            const user = User.fromStorageString(oidcStorage);
            let token = null;
            if (!user.expired) {
                token = user?.access_token;
                axios.post(import.meta.env.VITE_APP_PUBLISH_URL + "/validate", formData, {
                    onUploadProgress: (progressEvent) => {
                        const { loaded, total } = progressEvent;
                        if (total){
                            let percentage = Math.floor((loaded * 100) / total);
                            setUploadedPercentage(percentage);
                        }
                    },
                    headers: {"Authorization": "Bearer " + token}
                }).then((response) => {
                    const data = response.data;
                    setActive(1);
                    setUploaded(data);
                    uploadForm.setValues({
                        name: data?.metadata?.name,
                        pubDescription: data?.metadata?.pubDescription,
                        licenceUrl: findUrlRecognised(data?.metadata?.licenceUrl),
                        citation: data?.metadata?.citation,
                        rights: data?.metadata?.rights,
                        purpose: data?.metadata?.purpose,
                        methodStepDescription: data?.metadata?.methodStepDescription,
                        qualityControlDescription: data?.metadata?.qualityControlDescription
                    });
                    setUploading(false);
                })
                .catch((err) => {
                    setUploading(false);
                    setActive(1);
                    console.log("File upload error", err);
                    if (err?.response?.data){
                        setUploaded(err.response.data);
                    } else if (err?.code){
                        setUploaded({
                            error: err.code,
                            message: err.message,
                            valid: false
                        } as ValidatorResponse);
                    }
                });
            } else {
                localStorage.removeItem(`oidc.user:${import.meta.env.VITE_OIDC_AUTH_SERVER}:${import.meta.env.VITE_OIDC_CLIENT_ID}`);
            }
        }
    }

    if (!user || user.expired){
        return <Grid mb="md">
            <Grid.Col xs={1} sm={2}>
                <Sidebar selected="upload" />
            </Grid.Col>
            <Grid.Col xs={12} sm={10}>
                <Group position="center" spacing="xl" style={{ minHeight: rem(120), border: '1px dashed #ced4da' }}>
                    <Text>Please log in to upload a dataset</Text>
                    <Button onClick={() => void auth.signinRedirect()}>Login</Button>
                </Group>
            </Grid.Col>
        </Grid>;
    }

    function setStep(step: number){
        if (active < 3){
            if (step == 0 && !uploading) {
                setActive(step);
            }
            if ((step == 2 || step == 1 ) && uploaded && uploaded.valid) {
                setActive(step);
            }
        }
    }

    const iconStyle = { width: rem(12), height: rem(12) };
    const uploadedFailed = uploaded && !uploaded.valid;

    const occurrenceExtension: ValidationReport | null = uploaded?.extensionValidations && uploaded?.extensionValidations.length> 0 &&
        uploaded?.extensionValidations[0].recordType == 'Occurrence' ? uploaded?.extensionValidations[0] : null;

    return <Grid mb="md">
        <Grid.Col xs={1} sm={2}>
            <Sidebar selected="upload" />
        </Grid.Col>
        <Grid.Col xs={12} sm={10}>

            <Title order={3} size="h1">Publish your dataset</Title>
            <Space h="xl"/>
            <Stepper active={active} onStepClick={setStep} breakpoint="sm" style={{ marginTop: '20px', marginBottom: '40px'}}>
                {uploadedFailed &&
                    <Stepper.Step
                        label="Upload"
                        description="Invalid Darwin Core Archive"
                        completedIcon={<IconCircleX size="3.1rem" />}>
                    </Stepper.Step>
                }
                {!uploadedFailed &&
                    <Stepper.Step label="Upload" description="Upload Darwin Core Archive">
                    </Stepper.Step>
                }
                <Stepper.Step label="Map preview" description="Check data">
                </Stepper.Step>
                <Stepper.Step label="Check metadata" description="Verify dataset metadata">
                </Stepper.Step>
                <Stepper.Step label="Start publishing" description="Publishing the dataset">
                </Stepper.Step>
                <Stepper.Step label="Published" description="Dataset available online">
                </Stepper.Step>
                <Stepper.Completed>
                </Stepper.Completed>
            </Stepper>

            { uploading && <Group position="center" spacing="xl" style={{ minHeight: rem(120), pointerEvents: 'none',  border: '1px dashed #ced4da' }}>
                { uploadedPercentage == 100 &&  <Loader /> }
                <div>
                    { uploadedPercentage < 100 && <>
                        <Group>
                        <IconUpload />
                        <Text size="xl">
                            Uploading your darwin core archive
                        </Text>
                        </Group>
                    </>
                    }

                    { uploadedPercentage == 100 && <>
                        <Text size="xl">
                            Validating your darwin core archive
                        </Text>
                        <Text size="sm">
                            Extracting metadata, generating previews
                        </Text>
                    </>
                    }

                    { uploadedPercentage < 100 && <>
                        <Space h={20}/>
                        <Progress value={uploadedPercentage} label={`${uploadedPercentage}%`} striped animate radius="lg" size="xl" />
                    </>
                    }
                </div>
            </Group>}

            { !uploading && uploaded && !ingestDetails && <>

                { !uploaded.valid && <>
                    <Group position="center" spacing="xl" style={{ minHeight: rem(120), pointerEvents: 'none', border: '1px dashed #ced4da' }}>
                        <div>
                            <Group>
                                <IconFileX
                                    size="4.2rem" stroke={1.2}
                                    color={theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 4 : 6]}
                                />
                                <Text size="xl">
                                    Archive failed validation checks
                                </Text>
                            </Group>
                            <Space h={10}/>
                        </div>
                    </Group>
                    <Space h={20} />
                    <Group position="center" spacing="xl">
                        {uploaded.error &&
                            <Alert icon={<IconAlertCircle size="2rem" />} title={<FormattedMessage  id={uploaded.error} defaultMessage={uploaded.error}/>} color="red">
                                {uploaded.message}
                                <Space h={10}/>
                                <Text>
                                    <FormattedMessage id={`${uploaded.error}.description`} defaultMessage={``}/>
                                </Text>
                            </Alert>
                        }
                        {uploaded.coreValidation && uploaded.coreValidation.errors?.map((error: string) =>
                            <Alert icon={<IconAlertCircle size="2rem" />} title={<FormattedMessage  id={error} defaultMessage={error}/>} color="red">
                                {uploaded.message}
                                 <Space h={10}/>
                                <Text>
                                    <FormattedMessage id={`${error}.description`} defaultMessage={``}/>
                                </Text>
                            </Alert>
                        )}
                    </Group>
                    <Group position="center" mt="xl">
                        <Button variant="outline" onClick={() => reset()}>Retry</Button>
                    </Group>
                </>
                }

                { uploaded.valid && active == 1 && <>
                        <Grid>
                            <Grid.Col span={9}>
                                <Tabs defaultValue="mapPreview">
                                    <Tabs.List>
                                        <Tabs.Tab value="mapPreview" icon={<IconMap style={iconStyle} />}>Map preview</Tabs.Tab>
                                        <Tabs.Tab value="chartsPreview" icon={<IconChartBar style={iconStyle} />}>Chart preview</Tabs.Tab>
                                        <Tabs.Tab value="datafieldPreview" icon={<IconTable style={iconStyle} />}>Data fields</Tabs.Tab>
                                    </Tabs.List>
                                    <Tabs.Panel value="mapPreview" pt="xs">
                                        <Image src={`data:image/png;base64, ${uploaded.mapImage}`}
                                               alt="Map preview image"
                                               style={{ backgroundColor: 'lightgrey'}}
                                               withPlaceholder={true}
                                        />
                                    </Tabs.Panel>

                                    <Tabs.Panel value="chartsPreview" pt="xs">
                                        <Space h={20}/>

                                        { uploaded?.breakdowns['day'] && uploaded?.breakdowns['month'] &&
                                            <Grid>
                                                <Grid.Col span={6}>
                                                    <Histogram data={uploaded?.breakdowns['day']} title="Records by day" fieldName="Day" />
                                                </Grid.Col>
                                                <Grid.Col span={6}>
                                                    <Histogram data={uploaded?.breakdowns['month']} title="Records by month" fieldName="Month" />
                                                </Grid.Col>
                                            </Grid>
                                        }

                                        <Histogram data={uploaded?.breakdowns['year']} title="Records by year" fieldName="Year"/>

                                        { uploaded?.breakdowns['scientificName'] &&
                                            <Histogram data={uploaded?.breakdowns['scientificName']} title="Top 20 scientific names" horizontal={true} fieldName="Scientific name" />
                                        }

                                        { uploaded?.breakdowns['family'] &&
                                            <Histogram data={uploaded?.breakdowns['family']}  title="Top 20 family names" horizontal={true} fieldName="Family" />
                                        }
                                    </Tabs.Panel>
                                    <Tabs.Panel value="datafieldPreview" >
                                        <Space h={20}/>
                                        {Object.keys(uploaded?.coreValidation.column_counts).length < 50 &&
                                            <StackedBar data={uploaded?.coreValidation.column_counts}
                                                        title={`How ${uploaded?.datasetType} fields are populated`}
                                                        horizontal={true}
                                                        xaxisMax={uploaded.coreValidation.record_count} />
                                        }
                                        {Object.keys(uploaded?.coreValidation.column_counts).length >= 50 &&
                                            <StackedBar data={uploaded?.coreValidation.column_counts}
                                                        title={`How ${uploaded?.datasetType} fields are populated`}
                                                        horizontal={true}
                                                        hideEmpty={true}
                                                        xaxisMax={uploaded.coreValidation.record_count} />
                                        }

                                        { occurrenceExtension && <>
                                            <Space h={20}/>
                                            {Object.keys(occurrenceExtension.column_counts).length < 50 &&
                                                <StackedBar data={occurrenceExtension.column_counts}
                                                            title="How occurrence fields are populated"
                                                            horizontal={true}
                                                            xaxisMax={occurrenceExtension.record_count} />
                                            }
                                            {Object.keys(occurrenceExtension.column_counts).length >= 50 &&
                                                <StackedBar data={occurrenceExtension.column_counts}
                                                            title="How occurrence fields are populated"
                                                            horizontal={true}
                                                            hideEmpty={true}
                                                            xaxisMax={occurrenceExtension.record_count} />
                                            }
                                        </>}
                                    </Tabs.Panel>
                                </Tabs>
                            </Grid.Col>
                            <Grid.Col span={3}>
                                <Space h={30} />
                                <Paper shadow="xl" p="md" withBorder>
                                    <Group noWrap={true}>
                                        <IconNote />
                                        <Text size={"lg"}>File uploaded and validated</Text>
                                    </Group>
                                    <Space h={20}/>
                                    <Title order={1} size="h4" weight={'normal'}>File: {uploaded.fileName}</Title>
                                    <Title order={1} size="h4" weight={'normal'}>Dataset type: {uploaded.datasetType} </Title>
                                    {uploaded.datasetType == 'event' &&
                                        <Title order={1} size="h4" weight={'normal'}>Events: <FormattedNumber value={uploaded.coreValidation.record_count}/></Title>
                                    }
                                    <Title order={1} size="h4" weight={'normal'}>Records: <FormattedNumber value={uploaded.coreValidation.record_count}/></Title>
                                    <Title order={1} size="h4" weight={'normal'}>Fields: <FormattedNumber value={Object.keys(uploaded.coreValidation.column_counts).length}/></Title>
                                    <Space h={30}/>
                                    <Title order={3} size="h4">Preliminary data checks</Title>

                                    <FieldSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldName="scientificName" label="Scientific name" totalRecords={uploaded.coreValidation.record_count} skipWarning={false}/>
                                    <FieldSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldName="basisOfRecord" label="Basis of record" totalRecords={uploaded.coreValidation.record_count} skipWarning={false}/>

                                    <FieldsSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldNames={['decimalLatitude', 'decimalLongitude']} label="Coordinates" totalRecords={uploaded.coreValidation.record_count} skipWarning={false}/>

                                    <FieldsNotSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts}fieldNames={['scientificName', 'genus', 'family', 'order', 'class', 'phylum', 'kingdom']} label="No taxonomic information" totalRecords={uploaded.coreValidation.record_count}/>
                                    <FieldsNotSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldNames={['eventDate', 'month', 'year']} label="No date information" totalRecords={uploaded.coreValidation.record_count}/>

                                    <FieldSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldName="eventDate" label="Event date" totalRecords={uploaded.coreValidation.record_count} skipWarning={true}/>
                                    <FieldSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldName="month" label="Month" totalRecords={uploaded.coreValidation.record_count} skipWarning={true}/>
                                    <FieldSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldName="year" label="Year" totalRecords={uploaded.coreValidation.record_count} skipWarning={true}/>

                                    <FieldSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldName="geodeticDatum" label="Geodetic datum" totalRecords={uploaded.coreValidation.record_count} skipWarning={false}/>
                                    <FieldSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldName="coordinateUncertaintyInMeters" label="Coord. uncertainty" totalRecords={uploaded.coreValidation.record_count} skipWarning={false}/>
                                    <FieldSupplied column_counts={uploaded?.coreValidation.column_counts} occcolumn_counts={occurrenceExtension?.column_counts} fieldName="coordinatePrecision" label="Coord. precision" totalRecords={uploaded.coreValidation.record_count} skipWarning={false} />
                                    <Space h={30}/>
                                    <Button variant="outline" onClick={() => setActive(2)}>Next</Button>
                                </Paper>
                            </Grid.Col>
                        </Grid>
                    </>
                }

                { uploaded.valid && active == 2 && <>
                    <Grid>
                        <Grid.Col span={9}>
                            <LoadingOverlay visible={ingesting} overlayBlur={3} />
                            <form style={{ backgroundColor: '#f6f6f6', borderRadius: '6px', padding: '20px', paddingLeft: '35px', paddingRight: '35px'}} onSubmit={uploadForm.onSubmit((values) => startIngest(values as DatasetUpload)) }>
                                <TextInput
                                    withAsterisk
                                    label="Dataset name"
                                    placeholder="Set the dataset name"
                                    // disabled={ingesting}
                                    readOnly={uploaded.hasEml}
                                    {...uploadForm.getInputProps("name")}
                                />
                                <Space h="md" />
                                <Textarea
                                    autosize
                                    minRows={5}
                                    withAsterisk
                                    label="Description"
                                    placeholder="Add a description..."
                                    // disabled={ingesting}
                                    readOnly={uploaded.hasEml}
                                    {...uploadForm.getInputProps("pubDescription")}
                                />
                                <Space h="md" />
                                <Select
                                    withAsterisk
                                    label="Licence"
                                    placeholder="Select a licence"
                                    // disabled={ingesting}
                                    readOnly={uploaded.hasEml && isUrlRecognised(uploaded.metadata.licenceUrl)}
                                    data={recognisedLicences}
                                    {...uploadForm.getInputProps("licenceUrl")}
                                />

                                <Space h="md" />
                                <Textarea
                                    autosize
                                    minRows={5}
                                    withAsterisk
                                    label="Citation"
                                    placeholder="Add a citation..."
                                    // disabled={ingesting}
                                    readOnly={uploaded.hasEml && uploaded.metadata.citation}
                                    {...uploadForm.getInputProps("citation")}
                                />

                                <Space h="md" />
                                <Textarea
                                    autosize
                                    minRows={5}
                                    withAsterisk
                                    label="Rights"
                                    placeholder="Add a rights..."
                                    // disabled={ingesting}
                                    readOnly={uploaded.hasEml && uploaded.metadata.rights}
                                    {...uploadForm.getInputProps("rights")}
                                />
                                <Space h="md" />
                                <Divider my="sm" variant="dashed" />
                                <Space h="md" />
                                <Textarea
                                    autosize
                                    minRows={5}
                                    label="Purpose"
                                    placeholder="Add a purpose..."
                                    // disabled={ingesting}
                                    readOnly={uploaded.hasEml && uploaded.metadata.purpose}
                                    {...uploadForm.getInputProps("purpose")}
                                />

                                <Space h="md" />
                                <Textarea
                                    autosize
                                    minRows={5}
                                    label="Method"
                                    placeholder="Add methods..."
                                    // disabled={ingesting}
                                    readOnly={uploaded.hasEml && uploaded.metadata.methodStepDescription}
                                    {...uploadForm.getInputProps("methodStepDescription")}
                                />

                                <Space h="md" />
                                <Textarea
                                    autosize
                                    minRows={5}
                                    label="Quality control"
                                    placeholder="Add data quality details ..."
                                    // disabled={ingesting}
                                    readOnly={uploaded.hasEml && uploaded.metadata.qualityControlDescription}
                                    {...uploadForm.getInputProps("qualityControlDescription")}
                                />

                                <Group position="center" mt="xl">
                                    <Button variant="outline" disabled={ingesting} onClick={() => reset()}>Cancel</Button>
                                    <Button variant="outline" type="submit" disabled={ingesting}>Publish dataset</Button>
                                </Group>
                            </form>
                        </Grid.Col>
                        <Grid.Col span={3} >
                            { uploaded.hasEml &&
                                <>
                                    <Paper shadow="xl" p="md" withBorder>
                                        <Group>
                                            <Group noWrap={true}>
                                                <IconNote />
                                                <Text size={"lg"}>EML document found</Text>
                                            </Group>
                                            <Text size="sm">
                                                This darwin core archive has an EML document.
                                                Values from this document are used to set metadata for this dataset.
                                                <br/>
                                                <br/>
                                                Please review the metadata for this dataset using the form.
                                                If you want to change this metadata, please update the EML document
                                                in the archive
                                                and re-upload.
                                                <br/>
                                                <br/>
                                                When ready, click the "Publish dataset" button.
                                            </Text>
                                        </Group>
                                    </Paper>
                                </>
                            }
                            { !uploaded.hasEml &&
                                <>
                                    <Space h={25}/>
                                    <Paper shadow="xl" p="md" withBorder>
                                        <Group>
                                            <Group noWrap={true}>
                                                <IconNote />
                                                <Text size={"lg"}>Provide metadata</Text>
                                            </Group>
                                            <Text size="sm">
                                                This darwin core archive does not have an EML document.
                                                <br/>
                                                <br/>
                                                Add the dataset metadata using this form.
                                                <br/>
                                                <br/>
                                                When ready, click the "Publish dataset" button.
                                            </Text>
                                        </Group>
                                    </Paper>
                                </>
                            }
                        </Grid.Col>
                    </Grid>
                </>}
            </>}

            { active == 0 && !uploading && (!uploaded || uploaded?.valid) && <>
                <Dropzone
                    onDrop={validateFile}
                    onReject={(files) => console.log('rejected files', files)}
                    maxSize={maxFileSize}
                    accept={["application/zip", "application/x-zip"]}>

                    <Group position="center" spacing="xl" style={{ minHeight: rem(120), pointerEvents: 'none' }}>
                        <Dropzone.Accept>
                            <IconUpload
                                size="3.2rem"
                                stroke={1.5}
                                color={theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 4 : 6]}
                            />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <IconX
                                size="3.2rem"
                                stroke={1.5}
                                color={theme.colors.red[theme.colorScheme === 'dark' ? 4 : 6]}
                            />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <IconFile size="4.2rem" stroke={1.2} />
                        </Dropzone.Idle>

                        <div>
                            <Text size="xl" inline>
                                Start by dragging a Darwin Core Archive here or click to select a file
                            </Text>
                            <Space h={10}/>
                            <Text size="md" inline color={`grey`}>
                                This will validate the archive and show publishing options
                            </Text>
                            <Space h={5}/>
                            <Text size="xs" inline color={`grey`}>
                                Max file size {maxFileSize / 1024 / 1024 / 1024}GB
                            </Text>
                        </div>
                    </Group>
                </Dropzone>
            </>
            }

            { ingestDetails && <>
                <Divider my="sm" variant="dashed" />
                <Space h={30}/>
                <ShowStatus requestID={ingestDetails.requestID} completed={() => setActive(5)} failed={()=> setActive(5) } />
                { active && active == 5 && <Group mt="xl">
                        <Button variant="outline" onClick={() => reset()}>Load another dataset</Button>
                    </Group>
                }
            </>}
        </Grid.Col>
    </Grid>;
}

function FieldsNotSupplied(props: { column_counts: any, occcolumn_counts:any, fieldNames: string[], label: string, totalRecords: number }) {
    let filtered = props.fieldNames.filter(fieldName => {
        return (props.column_counts.hasOwnProperty(fieldName) && props.column_counts[fieldName] > 0) ||
            (props.occcolumn_counts && props.occcolumn_counts.hasOwnProperty(fieldName) && props.occcolumn_counts[fieldName] > 0)
    });
    if (filtered.length == 0) {
        return <Group><IconCircleX color={`#c44d34`} /><Text>{props.label}</Text></Group>;
    } else {
        return null
    }
}

function FieldsSupplied(props: { column_counts: any, occcolumn_counts:any, fieldNames: string[], label: string, totalRecords: number, skipWarning: boolean }) {

    let filtered = props.fieldNames.filter(fieldName => {
        return (props.column_counts.hasOwnProperty(fieldName) && props.column_counts[fieldName] > 0) ||
            (props.occcolumn_counts && props.occcolumn_counts.hasOwnProperty(fieldName) && props.occcolumn_counts[fieldName] > 0);
    });

    if (filtered.length == props.fieldNames.length) {
        return <Group>
            <IconCircleCheck />
            <Text>{props.label}</Text>
        </Group>;
    } else if (!props.skipWarning) {
        return <Group><IconCircleX color={`#c44d34`} /><Text>{props.label} not supplied</Text></Group>;
    } else {
        return null;
    }
}

function FieldSupplied(props: { column_counts: any, occcolumn_counts:any, fieldName: string, label: string, totalRecords: number, skipWarning: boolean }) {

    if (props.column_counts.hasOwnProperty(props.fieldName) && props.column_counts[props.fieldName] > 0) {
        return <Group>
            <IconCircleCheck/>
            <Text>{props.label}</Text>
            <Text size="sm">({Math.floor((props.column_counts[props.fieldName] / props.totalRecords) * 100)} %)</Text>
        </Group>;
    } else if (props.occcolumn_counts && props.occcolumn_counts.hasOwnProperty(props.fieldName) && props.occcolumn_counts[props.fieldName] > 0) {
        return <Group>
            <IconCircleCheck />
            <Text>{props.label}</Text>
            <Text size="sm">({Math.floor((props.occcolumn_counts[props.fieldName] / props.totalRecords) *100)} %)</Text>
        </Group>;
    } else if (!props.skipWarning) {
        return <Group><IconCircleX color={`#c44d34`} /><Text>{props.label} not supplied</Text></Group>;
    } else {
        return null;
    }
}