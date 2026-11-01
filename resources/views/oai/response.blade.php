{!! '<'.'?xml version="1.0" encoding="UTF-8"?'.'>' !!}
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>{{ $responseDate }}</responseDate>
  <request @foreach ($requestArgs as $name => $value){{ $name }}="{{ $value }}" @endforeach>{{ $baseUrl }}</request>
@foreach ($oaiErrors as [$code, $message])
  <error code="{{ $code }}">{{ $message }}</error>
@endforeach
@if ($verb === 'Identify')
  <Identify>
    <repositoryName>{{ $identify['repositoryName'] }}</repositoryName>
    <baseURL>{{ $baseUrl }}</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>{{ $identify['adminEmail'] }}</adminEmail>
    <earliestDatestamp>{{ $identify['earliestDatestamp'] }}</earliestDatestamp>
    <deletedRecord>no</deletedRecord>
    <granularity>{{ \App\Journal\Seo\Oai\OaiPmh::GRANULARITY }}</granularity>
    <description>
      <oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier http://www.openarchives.org/OAI/2.0/oai-identifier.xsd">
        <scheme>oai</scheme>
        <repositoryIdentifier>{{ \App\Journal\Seo\Oai\OaiPmh::REPOSITORY }}</repositoryIdentifier>
        <delimiter>:</delimiter>
        <sampleIdentifier>{{ $identify['sampleIdentifier'] }}</sampleIdentifier>
      </oai-identifier>
    </description>
  </Identify>
@elseif ($verb === 'ListMetadataFormats')
  <ListMetadataFormats>
@foreach ($formats as $prefix => $format)
    <metadataFormat>
      <metadataPrefix>{{ $prefix }}</metadataPrefix>
      <schema>{{ $format['schema'] }}</schema>
      <metadataNamespace>{{ $format['namespace'] }}</metadataNamespace>
    </metadataFormat>
@endforeach
  </ListMetadataFormats>
@elseif ($verb === 'ListSets')
  <ListSets>
@foreach ($sets as $set)
    <set>
      <setSpec>{{ $set['spec'] }}</setSpec>
      <setName>{{ $set['name'] }}</setName>
    </set>
@endforeach
  </ListSets>
@elseif (in_array($verb, ['GetRecord', 'ListRecords', 'ListIdentifiers'], true))
  <{{ $verb }}>
@foreach ($records as $record)
@if ($verb === 'ListIdentifiers')
    @include('oai.header', ['header' => $record['header']])
@else
    <record>
      @include('oai.header', ['header' => $record['header']])
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
@foreach ($record['dc'] as $element)
          <dc:{{ $element[0] }}@isset($element[2]) xml:lang="{{ $element[2] }}"@endisset>{{ $element[1] }}</dc:{{ $element[0] }}>
@endforeach
        </oai_dc:dc>
      </metadata>
    </record>
@endif
@endforeach
@if (! empty($resumption))
    <resumptionToken completeListSize="{{ $resumption['completeListSize'] }}" cursor="{{ $resumption['cursor'] }}">{{ $resumption['token'] }}</resumptionToken>
@endif
  </{{ $verb }}>
@endif
</OAI-PMH>
